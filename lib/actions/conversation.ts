import "server-only";

import { and, eq, gt, sql } from "drizzle-orm";

import { messages } from "@/db/schema";
import { checkContentSafety, type SafetyProvider } from "@/lib/safety";
import { withUser, type Db } from "@/lib/db/client";

/**
 * Uebersicht, Gespraechsansicht, Weiterschreiben und die drei Loeschebenen.
 *
 * Jede Abfrage laeuft unter dem Nutzerkontext, jede Aktion prueft die
 * Eigentuemerschaft serverseitig. IDs aus dem Request werden nie als Beleg
 * dafuer genommen, dass jemand etwas darf.
 */

export const MESSAGE_MIN_LENGTH = 1;
export const MESSAGE_MAX_LENGTH = 4000;

export const MESSAGES_PER_WINDOW = 30;
export const MESSAGE_WINDOW_MINUTES = 60;

export type LetterStatus =
  | "waiting"
  | "in_progress"
  | "answered"
  | "flagged";

export type MyLetter = {
  id: string;
  excerpt: string;
  createdAt: Date;
  status: LetterStatus;
  isHidden: boolean;
  /** Begruendung der Moderation, DSA Art. 17. */
  hiddenReason: string | null;
  isDeleted: boolean;
  categories: Array<{ slug: string; label: string }>;
  /** Nur gesetzt, wenn wirklich ein Briefwechsel existiert. */
  conversationId: string | null;
};

export type MyReply = {
  conversationId: string;
  partnerAnomailId: string | null;
  excerpt: string;
  createdAt: Date;
  isArchived: boolean;
};

export type MyLettersView = {
  letters: MyLetter[];
  replies: MyReply[];
};

function excerptOf(content: string, limit = 220): string {
  const clean = content.trim();
  return clean.length <= limit ? clean : `${clean.slice(0, limit).trimEnd()}…`;
}

/** Eigene Briefe und eigene Antworten. */
export async function loadMyLetters(
  session: { user?: { id?: string | null } | null } | null,
): Promise<{ status: "ok"; data: MyLettersView } | { status: "failed"; message: string }> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  try {
    const data = await withUser({ user: { id: userId } }, async (_db, client) => {
      const letterRows = await client.query<{
        id: string;
        content: string;
        created_at: Date;
        status: LetterStatus;
        hidden_at: Date | null;
        hidden_reason: string | null;
        deleted_at: Date | null;
        conversation_id: string | null;
      }>(
        `SELECT l.id, l.content, l.created_at, l.status, l.hidden_at,
                l.hidden_reason, l.deleted_at,
                c.id AS conversation_id
           FROM letters l
           LEFT JOIN conversations c ON c.original_letter_id = l.id
          WHERE l.author_id = $1
          ORDER BY l.created_at DESC`,
        [userId],
      );

      const categoryRows = await client.query<{
        letter_id: string;
        slug: string;
        label: string;
      }>(
        `SELECT lc.letter_id, c.slug, c.label
           FROM letter_categories lc
           JOIN categories c ON c.id = lc.category_id
           JOIN letters l ON l.id = lc.letter_id
          WHERE l.author_id = $1
          ORDER BY c.label`,
        [userId],
      );

      const byLetter = new Map<string, Array<{ slug: string; label: string }>>();
      for (const row of categoryRows.rows) {
        const list = byLetter.get(row.letter_id) ?? [];
        list.push({ slug: row.slug, label: row.label });
        byLetter.set(row.letter_id, list);
      }

      // Eigene Antworten: Briefwechsel, in denen ich nicht der Briefautor bin.
      const replyRows = await client.query<{
        conversation_id: string;
        partner_anomail_id: string | null;
        content: string;
        created_at: Date;
        status: string;
      }>(
        `SELECT c.id AS conversation_id,
                p.anomail_id AS partner_anomail_id,
                m.content,
                m.created_at,
                c.status
           FROM conversations c
           JOIN letters l ON l.id = c.original_letter_id
           LEFT JOIN user_profiles p ON p.id = l.author_id
           JOIN LATERAL (
             SELECT content, created_at
               FROM messages
              WHERE conversation_id = c.id
                AND sender_id = $1
                AND is_original = false
              ORDER BY created_at ASC
              LIMIT 1
           ) m ON true
          WHERE l.author_id <> $1
          ORDER BY m.created_at DESC`,
        [userId],
      );

      return {
        letters: letterRows.rows.map((row) => ({
          id: row.id,
          excerpt: excerptOf(row.content),
          createdAt: row.created_at,
          status: row.status,
          isHidden: row.hidden_at !== null,
          hiddenReason: row.hidden_reason,
          isDeleted: row.deleted_at !== null,
          categories: byLetter.get(row.id) ?? [],
          conversationId: row.conversation_id,
        })),
        replies: replyRows.rows.map((row) => ({
          conversationId: row.conversation_id,
          partnerAnomailId: row.partner_anomail_id,
          excerpt: excerptOf(row.content),
          createdAt: row.created_at,
          isArchived: row.status === "archived",
        })),
      } satisfies MyLettersView;
    });

    return { status: "ok", data };
  } catch (error) {
    console.error(
      "[my-letters] Uebersicht konnte nicht geladen werden",
      JSON.stringify({
        userId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Deine Briefe konnten nicht geladen werden. Versuch es gleich noch einmal.",
    };
  }
}

export type ConversationMessage = {
  id: string;
  senderId: string;
  content: string;
  isOriginal: boolean;
  isOwn: boolean;
  isDeleted: boolean;
  /** Nur beim Absender wahr - der Empfaenger sieht die Nachricht gar nicht. */
  isHeld: boolean;
  /** Begruendung der Moderation, DSA Art. 17. Nur beim Absender gesetzt. */
  hiddenReason: string | null;
  createdAt: Date;
};

/**
 * Warum nicht mehr geschrieben werden kann.
 *
 * "blocked-by-you" bekommt ausschliesslich die blockierende Seite. Wer
 * blockiert wurde, sieht "closed" - denselben Zustand wie bei jedem anderen
 * geschlossenen Briefwechsel. Sonst liesse sich die Blockierung daran ablesen.
 */
export type ConversationClosedReason = "archived" | "blocked-by-you" | "closed";

export type ConversationView = {
  id: string;
  isArchived: boolean;
  partnerId: string;
  partnerAnomailId: string | null;
  canWrite: boolean;
  closedReason: ConversationClosedReason | null;
  messages: ConversationMessage[];
};

export type ConversationResult =
  | { status: "ok"; data: ConversationView }
  | { status: "not-found"; message: string }
  | { status: "failed"; message: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Laedt einen Briefwechsel.
 *
 * Die Teilnehmerpruefung steht ausdruecklich hier und verlaesst sich nicht
 * allein auf RLS: eine fremde Kennung soll einen erklaerten Zustand ergeben,
 * keine leere Seite und keinen Absturz.
 */
export async function loadConversation(
  session: { user?: { id?: string | null } | null } | null,
  conversationId: string,
): Promise<ConversationResult> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  if (!UUID_PATTERN.test(conversationId)) {
    return {
      status: "not-found",
      message:
        "Diesen Briefwechsel gibt es nicht, oder du gehörst nicht dazu. Deine eigenen Briefwechsel findest du unter Meine Briefe.",
    };
  }

  try {
    return await withUser({ user: { id: userId } }, async (_db, client) => {
      const conversation = await client.query<{
        id: string;
        status: string;
        participant_a_id: string;
        participant_b_id: string;
      }>(
        `SELECT id, status, participant_a_id, participant_b_id
           FROM conversations WHERE id = $1`,
        [conversationId],
      );

      const row = conversation.rows[0];

      // Keine Zeile heisst hier zweierlei: es gibt sie nicht, oder die Policy
      // gibt sie nicht frei. Beides fuehrt zur selben Antwort - wer nicht
      // dazugehoert, soll nicht einmal erfahren, ob es sie gibt.
      if (!row) {
        return {
          status: "not-found" as const,
          message:
            "Diesen Briefwechsel gibt es nicht, oder du gehörst nicht dazu. Deine eigenen Briefwechsel findest du unter Meine Briefe.",
        };
      }

      if (![row.participant_a_id, row.participant_b_id].includes(userId)) {
        return {
          status: "not-found" as const,
          message:
            "Diesen Briefwechsel gibt es nicht, oder du gehörst nicht dazu. Deine eigenen Briefwechsel findest du unter Meine Briefe.",
        };
      }

      const partnerId =
        row.participant_a_id === userId
          ? row.participant_b_id
          : row.participant_a_id;

      const partner = await client.query<{ anomail_id: string }>(
        `SELECT anomail_id FROM user_profiles WHERE id = $1`,
        [partnerId],
      );

      // app.is_blocked_between sieht beide Richtungen (SECURITY DEFINER).
      // Die zweite Spalte laeuft unter der Policy blocks_select_own und ist
      // deshalb nur wahr, wenn ICH blockiert habe.
      const blocking = await client.query<{
        blocked: boolean;
        blocked_by_me: boolean;
      }>(
        `SELECT app.is_blocked_between($1, $2) AS blocked,
                EXISTS (
                  SELECT 1 FROM blocks
                   WHERE blocker_id = $1 AND blocked_id = $2
                ) AS blocked_by_me`,
        [userId, partnerId],
      );

      const isArchived = row.status === "archived";
      const isBlocked = blocking.rows[0].blocked;
      const blockedByMe = blocking.rows[0].blocked_by_me;

      const closedReason: ConversationClosedReason | null = isArchived
        ? "archived"
        : isBlocked
          ? blockedByMe
            ? "blocked-by-you"
            : "closed"
          : null;

      const messageRows = await client.query<{
        id: string;
        sender_id: string;
        content: string;
        is_original: boolean;
        deleted_at: Date | null;
        hidden_at: Date | null;
        hidden_reason: string | null;
        created_at: Date;
      }>(
        `SELECT id, sender_id, content, is_original, deleted_at, hidden_at,
                hidden_reason, created_at
           FROM messages
          WHERE conversation_id = $1
          ORDER BY created_at ASC, id ASC`,
        [conversationId],
      );

      return {
        status: "ok" as const,
        data: {
          id: row.id,
          isArchived,
          partnerId,
          partnerAnomailId: partner.rows[0]?.anomail_id ?? null,
          canWrite: closedReason === null,
          closedReason,
          messages: messageRows.rows.map((message) => ({
            id: message.id,
            senderId: message.sender_id,
            // Geloeschte Nachrichten tragen ohnehin keinen Inhalt mehr; die
            // leere Zeichenkette hier ist der zweite Riegel.
            content: message.deleted_at ? "" : message.content,
            isOriginal: message.is_original,
            isOwn: message.sender_id === userId,
            isDeleted: message.deleted_at !== null,
            isHeld: message.hidden_at !== null,
            hiddenReason: message.hidden_reason,
            createdAt: message.created_at,
          })),
        },
      };
    });
  } catch (error) {
    console.error(
      "[conversation] Briefwechsel konnte nicht geladen werden",
      JSON.stringify({
        userId,
        conversationId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Der Briefwechsel konnte nicht geladen werden. Versuch es gleich noch einmal.",
    };
  }
}

export type PostMessageResult =
  | { status: "ok"; showCrisisNotice: boolean }
  | { status: "invalid"; message: string }
  | { status: "not-allowed"; message: string }
  | { status: "archived"; message: string }
  | { status: "rate-limited"; message: string }
  | { status: "failed"; message: string };

const DB_ERROR_MESSAGES: Record<
  string,
  { status: PostMessageResult["status"]; message: string }
> = {
  AN010: {
    status: "not-allowed",
    message:
      "Du gehörst nicht zu diesem Briefwechsel. Deine eigenen findest du unter Meine Briefe.",
  },
  AN011: {
    status: "archived",
    message:
      "Dieser Briefwechsel ist beendet. Es kann niemand mehr hineinschreiben.",
  },
  AN012: {
    status: "invalid",
    message: `Deine Nachricht muss zwischen ${MESSAGE_MIN_LENGTH} und ${MESSAGE_MAX_LENGTH} Zeichen lang sein.`,
  },
  AN013: {
    status: "failed",
    message: "Dein Konto ist gesperrt. Du kannst gerade nicht schreiben.",
  },
  // Bewusst derselbe Text fuer beide Richtungen. Waere er fuer die blockierte
  // Person ein anderer, koennte sie daran ablesen, dass sie blockiert wurde.
  AN014: {
    status: "archived",
    message:
      "In diesem Briefwechsel sind keine neuen Nachrichten mehr möglich. Der bisherige Verlauf bleibt für dich lesbar.",
  },
};

/** Weiterschreiben im Briefwechsel. */
export async function postMessage(
  session: { user?: { id?: string | null; isBanned?: boolean | null } | null } | null,
  input: { conversationId: string; content: string },
  options: { safetyProvider?: SafetyProvider; safetyTimeoutMs?: number } = {},
): Promise<PostMessageResult> {
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
      message: "Dein Konto ist gesperrt. Du kannst gerade nicht schreiben.",
    };
  }

  if (!UUID_PATTERN.test(input.conversationId)) {
    return {
      status: "not-allowed",
      message:
        "Du gehörst nicht zu diesem Briefwechsel. Deine eigenen findest du unter Meine Briefe.",
    };
  }

  const content = input.content.trim();

  if (content.length < MESSAGE_MIN_LENGTH) {
    return {
      status: "invalid",
      message: "Schreib etwas, bevor du absendest.",
    };
  }

  if (content.length > MESSAGE_MAX_LENGTH) {
    return {
      status: "invalid",
      message: `Deine Nachricht ist zu lang. Kürze sie auf höchstens ${MESSAGE_MAX_LENGTH} Zeichen.`,
    };
  }

  const verdict = await checkContentSafety(
    { content, targetType: "message" },
    { provider: options.safetyProvider, timeoutMs: options.safetyTimeoutMs },
  );

  try {
    return await withUser({ user: { id: userId } }, async (db, client) => {
      if (await isRateLimited(db, userId)) {
        return {
          status: "rate-limited" as const,
          message: `Du hast in der letzten Stunde ${MESSAGES_PER_WINDOW} Nachrichten geschrieben. Warte etwa eine Stunde, dann geht es weiter.`,
        };
      }

      await client.query(
        `SELECT message_id, held
           FROM post_message($1::uuid, $2, $3::risk_level, $4, $5::text[], $6, $7)`,
        [
          input.conversationId,
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
        showCrisisNotice: verdict.showCrisisNotice,
      };
    });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";

    console.error(
      "[conversation] Nachricht konnte nicht gespeichert werden",
      JSON.stringify({
        userId,
        conversationId: input.conversationId,
        code: code || null,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    const known = DB_ERROR_MESSAGES[code];

    if (known) {
      return { status: known.status, message: known.message } as PostMessageResult;
    }

    return {
      status: "failed",
      message:
        "Deine Nachricht konnte nicht gespeichert werden. Dein Text steht noch im Feld, versuch es gleich noch einmal.",
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
          sql`now() - (${MESSAGE_WINDOW_MINUTES}::int * interval '1 minute')`,
        ),
      ),
    );

  return (rows[0]?.count ?? 0) >= MESSAGES_PER_WINDOW;
}

export type DeletionResult =
  | { status: "ok" }
  | { status: "not-allowed"; message: string }
  | { status: "failed"; message: string };

/**
 * Loeschebene 1: eigene Nachricht.
 *
 * Der Inhalt wird geleert, nicht nur ausgeblendet. Ein blosses Flag liesse den
 * Text ueber jeden anderen Abfrageweg weiter lesbar - und der Nutzer hat ihn
 * geloescht, nicht versteckt. Die Blase bleibt als Platzhalter stehen, damit
 * der Verlauf der anderen Person nicht abbricht.
 *
 * Die WHERE-Bedingung traegt die Eigentuemerpruefung: sender_id muss der
 * angemeldete Nutzer sein. Die Policy messages_update_own prueft dasselbe noch
 * einmal.
 */
export async function deleteOwnMessage(
  session: { user?: { id?: string | null } | null } | null,
  messageId: string,
): Promise<DeletionResult> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  if (!UUID_PATTERN.test(messageId)) {
    return {
      status: "not-allowed",
      message: "Diese Nachricht gehört dir nicht.",
    };
  }

  try {
    return await withUser({ user: { id: userId } }, async (_db, client) => {
      const result = await client.query(
        `UPDATE messages
            SET deleted_at = now(),
                content    = ''
          WHERE id = $1
            AND sender_id = $2
            AND deleted_at IS NULL`,
        [messageId, userId],
      );

      if ((result.rowCount ?? 0) === 0) {
        return {
          status: "not-allowed" as const,
          message:
            "Diese Nachricht gehört dir nicht oder ist bereits gelöscht.",
        };
      }

      return { status: "ok" as const };
    });
  } catch (error) {
    console.error(
      "[conversation] Nachricht konnte nicht geloescht werden",
      JSON.stringify({
        userId,
        messageId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Die Nachricht konnte nicht gelöscht werden. Versuch es gleich noch einmal.",
    };
  }
}

/**
 * Loeschebene 2: eigener Brief.
 *
 * Setzt deleted_at auf letters und leert den Text. Ein wartender Brief faellt
 * damit aus der Zuweisung, weil assign_letter() auf deleted_at IS NULL filtert.
 *
 * Existiert bereits ein Briefwechsel, bleibt er bestehen: nur die
 * Original-Nachricht wird zum Platzhalter. Die Datenschutzseite sagt zu, dass
 * ein Verlauf, an dem eine andere Person beteiligt ist, nicht beschaedigt wird
 * - deshalb wird hier nichts geloescht, was der anderen Person gehoert.
 */
export async function deleteOwnLetter(
  session: { user?: { id?: string | null } | null } | null,
  letterId: string,
): Promise<DeletionResult> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  if (!UUID_PATTERN.test(letterId)) {
    return { status: "not-allowed", message: "Dieser Brief gehört dir nicht." };
  }

  try {
    return await withUser({ user: { id: userId } }, async (_db, client) => {
      const result = await client.query(
        `UPDATE letters
            SET deleted_at = now(),
                content    = '',
                updated_at = now()
          WHERE id = $1
            AND author_id = $2
            AND deleted_at IS NULL`,
        [letterId, userId],
      );

      if ((result.rowCount ?? 0) === 0) {
        return {
          status: "not-allowed" as const,
          message: "Dieser Brief gehört dir nicht oder ist bereits gelöscht.",
        };
      }

      // Die Kopie des Brieftexts im Briefwechsel wird zum Platzhalter.
      // sender_id ist der Briefautor, also der angemeldete Nutzer - die Policy
      // messages_update_own laesst genau das zu und nichts darueber hinaus.
      await client.query(
        `UPDATE messages m
            SET deleted_at = now(),
                content    = ''
           FROM conversations c
          WHERE c.original_letter_id = $1
            AND m.conversation_id = c.id
            AND m.is_original
            AND m.sender_id = $2
            AND m.deleted_at IS NULL`,
        [letterId, userId],
      );

      return { status: "ok" as const };
    });
  } catch (error) {
    console.error(
      "[my-letters] Brief konnte nicht geloescht werden",
      JSON.stringify({
        userId,
        letterId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Der Brief konnte nicht gelöscht werden. Versuch es gleich noch einmal.",
    };
  }
}

/**
 * Loeschebene 3: Gespraech verlassen.
 *
 * Setzt den Briefwechsel auf archiviert. Beide sehen den Verlauf weiter,
 * niemand kann weiterschreiben. Es verschwindet nichts, was der anderen Person
 * gehoert.
 */
export async function archiveConversation(
  session: { user?: { id?: string | null } | null } | null,
  conversationId: string,
): Promise<DeletionResult> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  if (!UUID_PATTERN.test(conversationId)) {
    return {
      status: "not-allowed",
      message: "Du gehörst nicht zu diesem Briefwechsel.",
    };
  }

  try {
    return await withUser({ user: { id: userId } }, async (_db, client) => {
      const result = await client.query(
        `UPDATE conversations
            SET status     = 'archived',
                updated_at = now()
          WHERE id = $1
            AND status = 'active'
            AND $2 IN (participant_a_id, participant_b_id)`,
        [conversationId, userId],
      );

      if ((result.rowCount ?? 0) === 0) {
        return {
          status: "not-allowed" as const,
          message:
            "Du gehörst nicht zu diesem Briefwechsel, oder er ist bereits beendet.",
        };
      }

      return { status: "ok" as const };
    });
  } catch (error) {
    console.error(
      "[conversation] Briefwechsel konnte nicht archiviert werden",
      JSON.stringify({
        userId,
        conversationId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Der Briefwechsel konnte nicht beendet werden. Versuch es gleich noch einmal.",
    };
  }
}
