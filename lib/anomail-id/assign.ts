import type { PoolClient } from "pg";

import {
  ANOMAIL_ID_MAX_ATTEMPTS,
  AnomailIdAssignmentError,
  generateAnomailId,
} from "./index";

/** Unique-Verletzung in PostgreSQL. */
const UNIQUE_VIOLATION = "23505";

/**
 * Von PostgreSQL vergebener Name des Unique-Index auf users.email.
 * Aus "email text NOT NULL UNIQUE" in Migration 0004 folgt users_email_key.
 */
const EMAIL_UNIQUE_CONSTRAINT = "users_email_key";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}

export type CreatedUser = {
  id: string;
  email: string;
  anomailId: string;
  role: "user" | "moderator" | "admin";
  emailVerified: Date | null;
  bannedAt: Date | null;
};

/**
 * Legt einen Nutzer an und vergibt dabei genau einmal eine Anomail-ID.
 *
 * Die Kollisionsbehandlung laeuft ueber den Unique-Constraint, nicht ueber ein
 * vorheriges SELECT. Ein "gibt es die ID schon?"-SELECT waere eine Race
 * Condition: zwischen Pruefung und INSERT kann eine parallele Erstanmeldung
 * dieselbe ID belegen. Die Datenbank ist die einzige Stelle, die das
 * verlaesslich entscheiden kann.
 *
 * Der INSERT schliesst zurueckgezogene Kennungen im selben Schritt aus. Auch
 * das bewusst nicht als Vorabpruefung, sondern als Bedingung des Einfuegens -
 * sonst entstuende dieselbe Luecke ein zweites Mal.
 */
export async function createUserWithAnomailId(
  // Nur query() wird gebraucht. Die engere Bindung an PoolClient haette
  // ausgeschlossen, die Funktion mit einer einfachen Verbindung aufzurufen.
  client: Pick<PoolClient, "query">,
  email: string,
  emailVerified: Date | null,
  /**
   * Der Erzeuger ist einsetzbar, damit sich eine Kollision im Test gezielt
   * herbeifuehren laesst. Im Betrieb bleibt es beim kryptografischen Zufall.
   */
  generate: () => string = generateAnomailId,
): Promise<CreatedUser> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= ANOMAIL_ID_MAX_ATTEMPTS; attempt += 1) {
    const candidate = generate();

    // Savepoint pro Versuch.
    //
    // Der Aufrufer steckt in einer Transaktion (withServiceRole). Eine
    // Unique-Verletzung bricht dort die gesamte Transaktion ab - jeder
    // weitere Befehl liefe danach in "current transaction is aborted", und
    // die Wiederholung waere wirkungslos. Der Savepoint begrenzt den Abbruch
    // auf genau diesen einen Versuch.
    await client.query(`SAVEPOINT anomail_id_attempt`);

    try {
      const { rows } = await client.query<{
        id: string;
        email: string;
        anomail_id: string;
        role: CreatedUser["role"];
        email_verified: Date | null;
        banned_at: Date | null;
      }>(
        `INSERT INTO users (email, anomail_id, email_verified)
         SELECT $1, $2, $3
         WHERE NOT EXISTS (
           SELECT 1 FROM retired_anomail_ids r WHERE r.anomail_id = $2
         )
         RETURNING id, email, anomail_id, role, email_verified, banned_at`,
        [email, candidate, emailVerified],
      );

      const row = rows[0];

      if (!row) {
        // Kein Fehler, aber auch keine Zeile: die Kennung ist zurueckgezogen.
        // Naechster Versuch mit einer neuen.
        await client.query(`RELEASE SAVEPOINT anomail_id_attempt`);
        lastError = new Error(
          `Kennung ${candidate} ist zurueckgezogen und wird nicht erneut vergeben.`,
        );
        continue;
      }

      await client.query(`RELEASE SAVEPOINT anomail_id_attempt`);

      return {
        id: row.id,
        email: row.email,
        anomailId: row.anomail_id,
        role: row.role,
        emailVerified: row.email_verified,
        bannedAt: row.banned_at,
      };
    } catch (error) {
      // Erst den Versuch zuruecknehmen, dann entscheiden. Ohne das bliebe die
      // Transaktion abgebrochen und selbst das Weiterreichen des Fehlers
      // wuerde spaeter an einem Folgebefehl scheitern.
      await client.query(`ROLLBACK TO SAVEPOINT anomail_id_attempt`);
      await client.query(`RELEASE SAVEPOINT anomail_id_attempt`);

      if (!isUniqueViolation(error)) {
        // Kein Kollisionsfall - hier hilft kein weiterer Versuch.
        throw error;
      }

      lastError = error;

      // Die E-Mail-Adresse ist ebenfalls unique. Kollidiert sie, ist der Nutzer
      // bereits vorhanden und ein weiterer Versuch waere sinnlos - er wuerde
      // ANOMAIL_ID_MAX_ATTEMPTS mal denselben Fehler erzeugen.
      const constraint = (error as { constraint?: string }).constraint;
      if (constraint === EMAIL_UNIQUE_CONSTRAINT) {
        throw error;
      }
    }
  }

  const failure = new AnomailIdAssignmentError(ANOMAIL_ID_MAX_ATTEMPTS, {
    cause: lastError,
  });

  console.error(
    "[anomail-id] Vergabe gescheitert",
    JSON.stringify({
      attempts: ANOMAIL_ID_MAX_ATTEMPTS,
      reason: lastError instanceof Error ? lastError.message : String(lastError),
    }),
  );

  throw failure;
}

/**
 * Zieht eine Kennung dauerhaft zurueck.
 * Wird beim Loeschen eines Kontos gebraucht; die Loeschroute selbst entsteht
 * in einem spaeteren Arbeitspaket.
 */
export async function retireAnomailId(
  client: PoolClient,
  anomailId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO retired_anomail_ids (anomail_id)
     VALUES ($1)
     ON CONFLICT (anomail_id) DO NOTHING`,
    [anomailId],
  );
}
