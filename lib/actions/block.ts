import "server-only";

import { and, eq, gt, sql } from "drizzle-orm";

import { blocks } from "@/db/schema";
import { withUser, type Db } from "@/lib/db/client";

/**
 * Blockieren.
 *
 * blocker_id kommt ausschliesslich aus der Session. Vom Client kommt nur, wen
 * es betrifft - und auch das wird gegen eine bestehende Beziehung geprueft.
 *
 * Ob jemand blockiert wurde, darf fuer die betroffene Person nicht erkennbar
 * sein: es entsteht keine Benachrichtigung, und die Fehlermeldung beim
 * Schreiben ist in beide Richtungen dieselbe.
 */

export const BLOCKS_PER_WINDOW = 20;
export const BLOCK_WINDOW_MINUTES = 60;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BlockResult =
  | { status: "ok" }
  | { status: "not-allowed"; message: string }
  | { status: "rate-limited"; message: string }
  | { status: "failed"; message: string };

/**
 * Blockiert eine Person.
 *
 * Erlaubt nur gegenueber jemandem, mit dem eine Beziehung besteht - also einem
 * Gespraechspartner. Ohne diese Bedingung liesse sich mit geratenen Kennungen
 * eine Blockliste gegen beliebige Konten aufbauen.
 */
export async function blockUser(
  session: { user?: { id?: string | null; isBanned?: boolean | null } | null } | null,
  blockedId: string,
): Promise<BlockResult> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  if (!UUID_PATTERN.test(blockedId)) {
    return {
      status: "not-allowed",
      message: "Diese Person kannst du nicht blockieren.",
    };
  }

  // Selbstblockierung faellt hier und zusaetzlich am CHECK der Tabelle durch.
  if (blockedId === userId) {
    return {
      status: "not-allowed",
      message: "Du kannst dich nicht selbst blockieren.",
    };
  }

  try {
    return await withUser({ user: { id: userId } }, async (db, client) => {
      if (await isRateLimited(db, userId)) {
        return {
          status: "rate-limited" as const,
          message: `Du hast in der letzten Stunde ${BLOCKS_PER_WINDOW} Personen blockiert. Warte etwa eine Stunde, dann geht es weiter.`,
        };
      }

      // Gibt es ueberhaupt einen gemeinsamen Briefwechsel? Die Policy auf
      // conversations gibt nur eigene heraus, die Abfrage traegt die Pruefung
      // also selbst.
      const shared = await client.query(
        `SELECT 1 FROM conversations
          WHERE ($1 = participant_a_id AND $2 = participant_b_id)
             OR ($1 = participant_b_id AND $2 = participant_a_id)
          LIMIT 1`,
        [userId, blockedId],
      );

      if ((shared.rowCount ?? 0) === 0) {
        return {
          status: "not-allowed" as const,
          message: "Diese Person kannst du nicht blockieren.",
        };
      }

      await client.query(
        `INSERT INTO blocks (blocker_id, blocked_id)
         VALUES ($1, $2)
         ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
        [userId, blockedId],
      );

      return { status: "ok" as const };
    });
  } catch (error) {
    console.error(
      "[block] Blockierung fehlgeschlagen",
      JSON.stringify({
        userId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Die Blockierung konnte nicht gespeichert werden. Versuch es gleich noch einmal.",
    };
  }
}

/** Hebt eine eigene Blockierung auf. Sofort wirksam, ohne Rueckfrage. */
export async function unblockUser(
  session: { user?: { id?: string | null } | null } | null,
  blockedId: string,
): Promise<BlockResult> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  if (!UUID_PATTERN.test(blockedId)) {
    return {
      status: "not-allowed",
      message: "Diese Blockierung gibt es nicht.",
    };
  }

  try {
    return await withUser({ user: { id: userId } }, async (_db, client) => {
      // Die Policy blocks_delete_own laesst ohnehin nur eigene Zeilen zu; die
      // WHERE-Bedingung sagt dasselbe noch einmal ausdruecklich.
      await client.query(
        `DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
        [userId, blockedId],
      );

      return { status: "ok" as const };
    });
  } catch (error) {
    console.error(
      "[block] Aufheben fehlgeschlagen",
      JSON.stringify({
        userId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Die Blockierung konnte nicht aufgehoben werden. Versuch es gleich noch einmal.",
    };
  }
}

async function isRateLimited(db: Db, userId: string): Promise<boolean> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(blocks)
    .where(
      and(
        eq(blocks.blockerId, userId),
        gt(
          blocks.createdAt,
          sql`now() - (${BLOCK_WINDOW_MINUTES}::int * interval '1 minute')`,
        ),
      ),
    );

  return (rows[0]?.count ?? 0) >= BLOCKS_PER_WINDOW;
}

export type BlockedPerson = {
  id: string;
  anomailId: string | null;
  blockedAt: Date;
};

export async function loadBlockedPeople(
  session: { user?: { id?: string | null } | null } | null,
): Promise<
  | { status: "ok"; people: BlockedPerson[] }
  | { status: "failed"; message: string }
> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  try {
    const people = await withUser(
      { user: { id: userId } },
      async (_db, client) => {
        const { rows } = await client.query<{
          blocked_id: string;
          anomail_id: string | null;
          created_at: Date;
        }>(
          `SELECT b.blocked_id, p.anomail_id, b.created_at
             FROM blocks b
             LEFT JOIN user_profiles p ON p.id = b.blocked_id
            WHERE b.blocker_id = $1
            ORDER BY b.created_at DESC`,
          [userId],
        );

        return rows.map((row) => ({
          id: row.blocked_id,
          anomailId: row.anomail_id,
          blockedAt: row.created_at,
        }));
      },
    );

    return { status: "ok", people };
  } catch (error) {
    console.error(
      "[block] Liste konnte nicht geladen werden",
      JSON.stringify({
        userId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Deine Blockierliste konnte nicht geladen werden. Versuch es gleich noch einmal.",
    };
  }
}
