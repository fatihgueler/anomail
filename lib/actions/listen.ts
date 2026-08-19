import "server-only";

import { and, eq, gt, sql } from "drizzle-orm";

import { messages } from "@/db/schema";
import { checkContentSafety, type SafetyProvider } from "@/lib/safety";
import { withUser, type Db } from "@/lib/db/client";

/**
 * Zuweisung, Freigabe und Antwort.
 *
 * Die gesamte Entscheidung liegt hier und in der Datenbank. Im Altsystem lief
 * die Zuweisung im Browser: alle laufenden Briefe laden, Lease im Client
 * pruefen, Blockierungen laden, zwanzig wartende Briefe holen, in JavaScript
 * filtern, den ersten nehmen und updaten. Weder atomar noch autorisiert.
 */

export const REPLY_MIN_LENGTH = 80;
export const REPLY_MAX_LENGTH = 4000;

/** Laufzeit einer Zuweisung. Spiegelt release_expired_leases() aus AP2. */
export const LEASE_MINUTES = 10;

/** Ratenbegrenzung pro Nutzer, gezaehlt an tatsaechlich gesendeten Antworten. */
export const REPLIES_PER_WINDOW = 10;
export const REPLY_WINDOW_MINUTES = 60;

export type AssignedLetter = {
  id: string;
  content: string;
  createdAt: Date;
  authorAnomailId: string;
  categories: Array<{ slug: string; label: string }>;
};

export type AssignResult =
  | { status: "assigned"; letter: AssignedLetter }
  | { status: "empty" }
  | { status: "failed"; message: string };

/**
 * Holt den Brief, an dem der Nutzer gerade arbeitet, oder weist einen neuen zu.
 *
 * Erst nachsehen, dann zuweisen: sonst bekaeme man bei jedem Neuladen der Seite
 * einen weiteren Brief zugeteilt, waehrend der vorige zehn Minuten lang
 * blockiert bliebe.
 *
 * Die Zuweisung selbst passiert ausschliesslich in assign_letter(). Hier wird
 * nichts gefiltert und nichts entschieden.
 */
export async function assignLetterForUser(
  session: { user?: { id?: string | null; isBanned?: boolean | null } | null } | null,
): Promise<AssignResult> {
  const userId = session?.user?.id;

  if (!userId) {
    return {
      status: "failed",
      message: "Du bist nicht mehr angemeldet. Melde dich neu an.",
    };
  }

  if (session?.user?.isBanned) {
    return {
      status: "failed",
      message: "Dein Konto ist gesperrt. Du kannst gerade keine Briefe lesen.",
    };
  }

  try {
    return await withUser({ user: { id: userId } }, async (_db, client) => {
      const running = await client.query<{ id: string }>(
        `SELECT id
           FROM letters
          WHERE responder_id = $1
            AND status = 'in_progress'
            AND assigned_at > now() - ($2::int * interval '1 minute')
          ORDER BY assigned_at DESC
          LIMIT 1`,
        [userId, LEASE_MINUTES],
      );

      const letterId =
        running.rows[0]?.id ??
        (
          await client.query<{ id: string | null }>(
            `SELECT id FROM assign_letter($1)`,
            [userId],
          )
        ).rows[0]?.id ??
        null;

      if (!letterId) {
        return { status: "empty" as const };
      }

      return {
        status: "assigned" as const,
        letter: await loadAssignedLetter(client, letterId),
      };
    });
  } catch (error) {
    console.error(
      "[listen] Zuweisung fehlgeschlagen",
      JSON.stringify({
        userId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Wir konnten gerade keinen Brief laden. Versuch es gleich noch einmal.",
    };
  }
}

type SqlClient = Parameters<Parameters<typeof withUser>[1]>[1];

async function loadAssignedLetter(
  client: SqlClient,
  letterId: string,
): Promise<AssignedLetter> {
  const { rows } = await client.query<{
    id: string;
    content: string;
    created_at: Date;
    anomail_id: string;
  }>(
    `SELECT l.id, l.content, l.created_at, p.anomail_id
       FROM letters l
       JOIN user_profiles p ON p.id = l.author_id
      WHERE l.id = $1`,
    [letterId],
  );

  const row = rows[0];

  if (!row) {
    throw new Error(`Brief ${letterId} nach der Zuweisung nicht lesbar.`);
  }

  const categories = await client.query<{ slug: string; label: string }>(
    `SELECT c.slug, c.label
       FROM letter_categories lc
       JOIN categories c ON c.id = lc.category_id
      WHERE lc.letter_id = $1
      ORDER BY c.label`,
    [letterId],
  );

  return {
    id: row.id,
    content: row.content,
    createdAt: row.created_at,
    authorAnomailId: row.anomail_id,
    categories: categories.rows,
  };
}

/** Gibt eine eigene Zuweisung sofort frei. */
export async function releaseAssignment(
  session: { user?: { id?: string | null } | null } | null,
  letterId: string,
): Promise<{ status: "released" | "nothing" | "failed"; message?: string }> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  try {
    return await withUser({ user: { id: userId } }, async (_db, client) => {
      const { rows } = await client.query<{ released: boolean }>(
        `SELECT release_letter_assignment($1) AS released`,
        [letterId],
      );

      return { status: rows[0].released ? ("released" as const) : ("nothing" as const) };
    });
  } catch (error) {
    console.error(
      "[listen] Freigabe fehlgeschlagen",
      JSON.stringify({
        userId,
        letterId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Der Brief konnte nicht freigegeben werden. Er wird nach zehn Minuten von selbst wieder frei.",
    };
  }
}

export type ReplyInput = {
  letterId: string;
  content: string;
};

export type ReplyResult =
  | { status: "ok"; conversationId: string; showCrisisNotice: boolean }
  | { status: "invalid"; message: string }
  | { status: "not-assigned"; message: string }
  | { status: "rate-limited"; message: string }
  | { status: "failed"; message: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ordnet die Fehlercodes aus reply_to_letter() erklaerten Zustaenden zu. */
const DB_ERROR_MESSAGES: Record<string, { status: ReplyResult["status"]; message: string }> = {
  AN001: {
    status: "not-assigned",
    message:
      "Dieser Brief ist dir nicht zugewiesen. Hol dir über Zuhören einen neuen Brief.",
  },
  AN002: {
    status: "not-assigned",
    message:
      "Deine Zuweisung ist abgelaufen und der Brief wurde weitergegeben. Deine Antwort wurde nicht gesendet. Hol dir über Zuhören einen neuen Brief.",
  },
  AN003: {
    status: "not-assigned",
    message:
      "Dieser Brief ist bereits beantwortet. Hol dir über Zuhören einen neuen Brief.",
  },
  AN004: {
    status: "failed",
    message: "Dein Konto ist gesperrt. Du kannst gerade nicht antworten.",
  },
  AN005: {
    status: "invalid",
    message: `Deine Antwort muss zwischen ${REPLY_MIN_LENGTH} und ${REPLY_MAX_LENGTH} Zeichen lang sein.`,
  },
};

/**
 * Der Antwort-Vorgang.
 *
 * Schritte 2 und 5 bis 10 laufen vollstaendig in reply_to_letter() und damit in
 * einer Transaktion. Die Zuweisungspruefung sperrt die Briefzeile, bevor
 * irgendetwas geschrieben wird - dazwischen kann weder eine zweite Antwort noch
 * die Lease-Rueckgabe fahren.
 */
export async function replyToLetter(
  session: { user?: { id?: string | null; isBanned?: boolean | null } | null } | null,
  input: ReplyInput,
  options: { safetyProvider?: SafetyProvider; safetyTimeoutMs?: number } = {},
): Promise<ReplyResult> {
  // 1. Kontext.
  const userId = session?.user?.id;

  if (!userId) {
    return {
      status: "failed",
      message:
        "Du bist nicht mehr angemeldet. Melde dich neu an, dein Text bleibt im Feld stehen.",
    };
  }

  if (session?.user?.isBanned) {
    return {
      status: "failed",
      message: "Dein Konto ist gesperrt. Du kannst gerade nicht antworten.",
    };
  }

  if (!UUID_PATTERN.test(input.letterId)) {
    return {
      status: "not-assigned",
      message:
        "Dieser Brief ist dir nicht zugewiesen. Hol dir über Zuhören einen neuen Brief.",
    };
  }

  // 3. Eingabe. Die Grenzen aus dem Browser sind fuer die Rueckmeldung da,
  //    nicht fuer die Entscheidung.
  const content = input.content.trim();

  if (content.length < REPLY_MIN_LENGTH) {
    return {
      status: "invalid",
      message: `Deine Antwort ist zu kurz. Schreib mindestens ${REPLY_MIN_LENGTH} Zeichen.`,
    };
  }

  if (content.length > REPLY_MAX_LENGTH) {
    return {
      status: "invalid",
      message: `Deine Antwort ist zu lang. Kürze sie auf höchstens ${REPLY_MAX_LENGTH} Zeichen.`,
    };
  }

  // 4. Pruefung. Liefert immer ein Ergebnis, auch bei Ausfall des Anbieters.
  const verdict = await checkContentSafety(
    { content, targetType: "message" },
    { provider: options.safetyProvider, timeoutMs: options.safetyTimeoutMs },
  );

  try {
    return await withUser({ user: { id: userId } }, async (db, client) => {
      if (await isRateLimited(db, userId)) {
        return {
          status: "rate-limited" as const,
          message: `Du hast in der letzten Stunde ${REPLIES_PER_WINDOW} Antworten geschrieben. Warte etwa eine Stunde, dann geht es weiter.`,
        };
      }

      const { rows } = await client.query<{
        conversation_id: string;
        message_id: string;
        held: boolean;
      }>(
        `SELECT conversation_id, message_id, held
           FROM reply_to_letter($1::uuid, $2, $3::risk_level, $4, $5::text[], $6, $7)`,
        [
          input.letterId,
          content,
          verdict.riskLevel,
          verdict.shouldHold,
          verdict.detectedCategories,
          verdict.reasoning,
          content,
        ],
      );

      return {
        status: "ok" as const,
        conversationId: rows[0].conversation_id,
        showCrisisNotice: verdict.showCrisisNotice,
      };
    });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";

    const known = DB_ERROR_MESSAGES[code];

    console.error(
      "[listen] Antwort konnte nicht gespeichert werden",
      JSON.stringify({
        userId,
        letterId: input.letterId,
        code: code || null,
        riskLevel: verdict.riskLevel,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    if (known) {
      return { status: known.status, message: known.message } as ReplyResult;
    }

    return {
      status: "failed",
      message:
        "Deine Antwort konnte nicht gespeichert werden. Dein Text steht noch im Feld, versuch es gleich noch einmal.",
    };
  }
}

async function isRateLimited(db: Db, userId: string): Promise<boolean> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(
      and(
        eq(messages.senderId, userId),
        eq(messages.isOriginal, false),
        gt(
          messages.createdAt,
          sql`now() - (${REPLY_WINDOW_MINUTES}::int * interval '1 minute')`,
        ),
      ),
    );

  return (rows[0]?.count ?? 0) >= REPLIES_PER_WINDOW;
}
