import "server-only";

import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "@auth/core/adapters";
import type { PoolClient } from "pg";

import { createUserWithAnomailId } from "@/lib/anomail-id/assign";
import { withServiceRole } from "@/lib/db/client";

/**
 * Eigener Auth.js-Adapter gegen das Schema aus AP2.
 *
 * Warum nicht der offizielle Drizzle-Adapter: der verlangt auf users die
 * Spalten name und image. Bei einem Dienst, dessen ganzer Punkt Anonymitaet
 * ist, waeren das zwei Spalten, die nie etwas enthalten duerfen. Statt sie
 * anzulegen und leer zu lassen, sind hier die knapp zehn Methoden selbst
 * geschrieben.
 *
 * Alle Zugriffe laufen ueber withServiceRole. Das ist kein Versehen: waehrend
 * der Anmeldung gibt es noch keinen Nutzerkontext, gegen den eine RLS-Policy
 * pruefen koennte. Die Auth-Tabellen haben deshalb gar keine Rechte fuer die
 * Anwendungsrolle - siehe db/migrations/0019_auth_tables.up.sql.
 */

/** Was aus users gelesen wird. Die E-Mail bleibt serverseitig. */
type UserRow = {
  id: string;
  email: string;
  anomail_id: string;
  role: "user" | "moderator" | "admin";
  email_verified: Date | null;
  banned_at: Date | null;
};

/** Die Felder, die Anomail zusaetzlich an der Session braucht. */
export type AnomailAdapterUser = AdapterUser & {
  anomailId: string;
  role: UserRow["role"];
  bannedAt: Date | null;
};

const USER_COLUMNS = `id, email, anomail_id, role, email_verified, banned_at`;

function toAdapterUser(row: UserRow): AnomailAdapterUser {
  return {
    id: row.id,
    email: row.email,
    emailVerified: row.email_verified,
    anomailId: row.anomail_id,
    role: row.role,
    bannedAt: row.banned_at,
  };
}

async function findUser(
  client: PoolClient,
  where: string,
  values: unknown[],
): Promise<AnomailAdapterUser | null> {
  const { rows } = await client.query<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE ${where} LIMIT 1`,
    values,
  );

  return rows[0] ? toAdapterUser(rows[0]) : null;
}

export function anomailAdapter(): Adapter {
  return {
    /**
     * Erstanmeldung. Hier und nur hier entsteht die Anomail-ID.
     * Die Kollisionsbehandlung steckt in createUserWithAnomailId und laeuft
     * ueber den Unique-Constraint, nicht ueber eine Vorabpruefung.
     */
    async createUser(user) {
      if (!user.email) {
        throw new Error(
          "createUser ohne E-Mail-Adresse. Bei Magic-Link-Anmeldung darf das nicht vorkommen.",
        );
      }

      return withServiceRole(async (_db, client) => {
        const created = await createUserWithAnomailId(
          client,
          user.email,
          user.emailVerified ?? null,
        );

        return {
          id: created.id,
          email: created.email,
          emailVerified: created.emailVerified,
          anomailId: created.anomailId,
          role: created.role,
          bannedAt: created.bannedAt,
        } satisfies AnomailAdapterUser;
      });
    },

    async getUser(id) {
      return withServiceRole((_db, client) => findUser(client, "id = $1", [id]));
    },

    async getUserByEmail(email) {
      return withServiceRole((_db, client) =>
        findUser(client, "email = $1", [email]),
      );
    },

    async getUserByAccount({ provider, providerAccountId }) {
      return withServiceRole(async (_db, client) => {
        const { rows } = await client.query<UserRow>(
          `SELECT ${USER_COLUMNS.split(", ")
            .map((column) => `u.${column}`)
            .join(", ")}
             FROM accounts a
             JOIN users u ON u.id = a.user_id
            WHERE a.provider = $1 AND a.provider_account_id = $2
            LIMIT 1`,
          [provider, providerAccountId],
        );

        return rows[0] ? toAdapterUser(rows[0]) : null;
      });
    },

    /**
     * Aendert ausschliesslich die Bestaetigung der E-Mail-Adresse.
     * Rolle, Sperrzustand und Anomail-ID sind hier bewusst nicht erreichbar -
     * der Anmeldevorgang hat keinen Grund, sie anzufassen.
     */
    async updateUser(user) {
      if (!user.id) {
        throw new Error("updateUser ohne id.");
      }

      return withServiceRole(async (_db, client) => {
        const { rows } = await client.query<UserRow>(
          `UPDATE users
              SET email_verified = COALESCE($2, email_verified),
                  updated_at     = now()
            WHERE id = $1
        RETURNING ${USER_COLUMNS}`,
          [user.id, user.emailVerified ?? null],
        );

        if (!rows[0]) {
          throw new Error(`Nutzer ${user.id} nicht gefunden.`);
        }

        return toAdapterUser(rows[0]);
      });
    },

    async linkAccount(account) {
      await withServiceRole(async (_db, client) => {
        await client.query(
          `INSERT INTO accounts (
             user_id, type, provider, provider_account_id,
             refresh_token, access_token, expires_at, token_type,
             scope, id_token, session_state
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            account.userId,
            account.type,
            account.provider,
            account.providerAccountId,
            account.refresh_token ?? null,
            account.access_token ?? null,
            account.expires_at ?? null,
            account.token_type ?? null,
            account.scope ?? null,
            account.id_token ?? null,
            account.session_state ?? null,
          ],
        );
      });

      return account as AdapterAccount;
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await withServiceRole(async (_db, client) => {
        await client.query(
          `DELETE FROM accounts WHERE provider = $1 AND provider_account_id = $2`,
          [provider, providerAccountId],
        );
      });
    },

    async createSession(session) {
      return withServiceRole(async (_db, client) => {
        const { rows } = await client.query<{
          session_token: string;
          user_id: string;
          expires: Date;
        }>(
          `INSERT INTO sessions (session_token, user_id, expires)
           VALUES ($1, $2, $3)
        RETURNING session_token, user_id, expires`,
          [session.sessionToken, session.userId, session.expires],
        );

        return {
          sessionToken: rows[0].session_token,
          userId: rows[0].user_id,
          expires: rows[0].expires,
        } satisfies AdapterSession;
      });
    },

    /**
     * Wird bei jeder Anfrage aufgerufen und liest die Nutzerzeile frisch.
     *
     * Genau das ist der Grund fuer Datenbank-Sitzungen statt JWT: eine Sperre
     * wirkt beim naechsten Aufruf, nicht erst wenn irgendwann ein Token
     * ablaeuft. Der Sperrzustand wandert von hier in die Session.
     */
    async getSessionAndUser(sessionToken) {
      return withServiceRole(async (_db, client) => {
        const { rows } = await client.query<
          UserRow & { session_token: string; user_id: string; expires: Date }
        >(
          `SELECT s.session_token, s.user_id, s.expires,
                  u.id, u.email, u.anomail_id, u.role, u.email_verified, u.banned_at
             FROM sessions s
             JOIN users u ON u.id = s.user_id
            WHERE s.session_token = $1
            LIMIT 1`,
          [sessionToken],
        );

        const row = rows[0];

        if (!row) {
          return null;
        }

        return {
          session: {
            sessionToken: row.session_token,
            userId: row.user_id,
            expires: row.expires,
          },
          user: toAdapterUser(row),
        };
      });
    },

    async updateSession(session) {
      return withServiceRole(async (_db, client) => {
        const { rows } = await client.query<{
          session_token: string;
          user_id: string;
          expires: Date;
        }>(
          `UPDATE sessions
              SET expires = COALESCE($2, expires)
            WHERE session_token = $1
        RETURNING session_token, user_id, expires`,
          [session.sessionToken, session.expires ?? null],
        );

        if (!rows[0]) {
          return null;
        }

        return {
          sessionToken: rows[0].session_token,
          userId: rows[0].user_id,
          expires: rows[0].expires,
        } satisfies AdapterSession;
      });
    },

    async deleteSession(sessionToken) {
      await withServiceRole(async (_db, client) => {
        await client.query(`DELETE FROM sessions WHERE session_token = $1`, [
          sessionToken,
        ]);
      });
    },

    async createVerificationToken(token) {
      return withServiceRole(async (_db, client) => {
        const { rows } = await client.query<{
          identifier: string;
          token: string;
          expires: Date;
        }>(
          `INSERT INTO verification_tokens (identifier, token, expires)
           VALUES ($1, $2, $3)
        RETURNING identifier, token, expires`,
          [token.identifier, token.token, token.expires],
        );

        return rows[0] satisfies VerificationToken;
      });
    },

    /**
     * Holt den Token und loescht ihn im selben Schritt.
     *
     * DELETE ... RETURNING statt SELECT und danach DELETE: nur so kann ein
     * Magic-Link nicht zweimal eingeloest werden, wenn er gleichzeitig zweimal
     * aufgerufen wird.
     */
    async useVerificationToken({ identifier, token }) {
      return withServiceRole(async (_db, client) => {
        const { rows } = await client.query<{
          identifier: string;
          token: string;
          expires: Date;
        }>(
          `DELETE FROM verification_tokens
            WHERE identifier = $1 AND token = $2
        RETURNING identifier, token, expires`,
          [identifier, token],
        );

        return rows[0] ?? null;
      });
    },
  };
}
