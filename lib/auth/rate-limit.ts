import "server-only";

import { createHmac } from "node:crypto";

import { withServiceRole } from "@/lib/db/client";

/**
 * Ratenbegrenzung fuer den Magic-Link-Versand.
 *
 * Ohne sie kann jeder, der eine fremde Adresse kennt, beliebig viele Mails an
 * sie ausloesen. Begrenzt wird deshalb doppelt: pro Adresse, damit niemand
 * zugeschuettet wird, und pro IP, damit niemand viele Adressen gleichzeitig
 * bearbeitet.
 */

export type RateLimitScope = "email" | "ip";

type Limit = { max: number; windowMinutes: number };

const LIMITS: Record<RateLimitScope, Limit> = {
  // Drei Anmeldelinks in einer Viertelstunde reichen fuer jeden ehrlichen
  // Versuch, auch wenn die erste Mail im Spam landet.
  email: { max: 3, windowMinutes: 15 },
  // Eine IP darf mehr, weil hinter ihr ein ganzes Netz stecken kann.
  ip: { max: 10, windowMinutes: 15 },
};

/** Wie lange Ereignisse aufbewahrt werden, bevor sie weggeraeumt werden. */
const RETENTION_MINUTES = 60;

export type RateLimitResult = {
  allowed: boolean;
  scope?: RateLimitScope;
  retryAfterSeconds?: number;
};

/**
 * Bezeichner werden nur als HMAC gespeichert.
 *
 * Eine Ratenbegrenzung braucht ausschliesslich Gleichheit, nie den Wert selbst.
 * So entsteht keine zweite Sammelstelle fuer E-Mail- und IP-Adressen.
 */
function hashIdentifier(value: string): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "AUTH_SECRET fehlt. Ohne Schluessel liessen sich die Bezeichner der Ratenbegrenzung nicht verdecken.",
    );
  }

  return createHmac("sha256", secret)
    .update(value.trim().toLowerCase())
    .digest("hex");
}

/**
 * Zaehlt die Versuche im Zeitfenster und protokolliert den aktuellen.
 *
 * Laeuft ueber die Dienstverbindung, weil es zum Zeitpunkt der Anmeldung noch
 * keinen Nutzerkontext gibt. Die Tabelle enthaelt keine Nutzerzeilen, sondern
 * nur Hashes und Zeitstempel.
 */
export async function checkAndRecord(
  identifiers: { email: string; ip: string | null },
): Promise<RateLimitResult> {
  const candidates: Array<{ scope: RateLimitScope; value: string }> = [
    { scope: "email", value: identifiers.email },
  ];

  if (identifiers.ip) {
    candidates.push({ scope: "ip", value: identifiers.ip });
  }

  return withServiceRole(async (_db, client) => {
    for (const candidate of candidates) {
      const limit = LIMITS[candidate.scope];
      const hash = hashIdentifier(candidate.value);

      const { rows } = await client.query<{ used: string; oldest: Date | null }>(
        `SELECT count(*) AS used, min(created_at) AS oldest
           FROM auth_rate_limit_events
          WHERE scope = $1::rate_limit_scope
            AND identifier_hash = $2
            AND created_at > now() - ($3::int * interval '1 minute')`,
        [candidate.scope, hash, limit.windowMinutes],
      );

      const used = Number(rows[0].used);

      if (used >= limit.max) {
        const oldest = rows[0].oldest;
        const retryAfterSeconds = oldest
          ? Math.max(
              1,
              Math.ceil(
                (oldest.getTime() +
                  limit.windowMinutes * 60_000 -
                  Date.now()) /
                  1000,
              ),
            )
          : limit.windowMinutes * 60;

        return {
          allowed: false,
          scope: candidate.scope,
          retryAfterSeconds,
        };
      }
    }

    for (const candidate of candidates) {
      await client.query(
        `INSERT INTO auth_rate_limit_events (scope, identifier_hash)
         VALUES ($1::rate_limit_scope, $2)`,
        [candidate.scope, hashIdentifier(candidate.value)],
      );
    }

    // Gelegenheit zum Aufraeumen. Guenstig, weil der Index auf created_at liegt.
    await client.query(
      `DELETE FROM auth_rate_limit_events
        WHERE created_at < now() - ($1::int * interval '1 minute')`,
      [RETENTION_MINUTES],
    );

    return { allowed: true };
  });
}

/** Nur fuer Tests: die geltenden Grenzen. */
export function getLimits(): Record<RateLimitScope, Limit> {
  return LIMITS;
}
