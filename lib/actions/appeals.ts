import "server-only";

import { withUser } from "@/lib/db/client";

/**
 * Widerspruch gegen eine Moderationsentscheidung.
 *
 * Der Digital Services Act verlangt in Art. 20 einen internen Weg, gegen eine
 * Entfernung oder eine Kontosperre vorzugehen. Dieser Weg gehoert den
 * Betroffenen, nicht der Moderation - deshalb liegt er ausserhalb von
 * lib/actions/moderation.
 *
 * Die Policy appeals_insert_own laesst nur den eigenen Namen zu; appellant_id
 * kommt aus der Session und ist nicht setzbar.
 */

export const APPEAL_MAX_LENGTH = 2000;

export type AppealTargetType = "letter" | "message" | "account";

export type AppealResult =
  | { status: "created" }
  | { status: "duplicate"; message: string }
  | { status: "invalid"; message: string }
  | { status: "not-allowed"; message: string }
  | { status: "failed"; message: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UNIQUE_VIOLATION = "23505";

export type OwnAppeal = {
  id: string;
  targetType: AppealTargetType;
  targetId: string | null;
  message: string;
  status: "open" | "upheld" | "rejected";
  decisionNote: string | null;
  createdAt: Date;
};

/**
 * Legt einen Widerspruch ein.
 *
 * Ein gesperrtes Konto darf das ausdruecklich - sonst waere der Weg gegen die
 * Sperre versperrt und das Verfahren wertlos.
 */
export async function submitAppeal(
  session: { user?: { id?: string | null } | null } | null,
  input: {
    targetType: AppealTargetType;
    targetId: string | null;
    message: string;
  },
): Promise<AppealResult> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  const message = input.message.trim();

  if (message.length === 0) {
    return {
      status: "invalid",
      message: "Schreib dazu, warum du die Entscheidung für falsch hältst.",
    };
  }

  if (message.length > APPEAL_MAX_LENGTH) {
    return {
      status: "invalid",
      message: `Dein Text ist zu lang. Kürze ihn auf höchstens ${APPEAL_MAX_LENGTH} Zeichen.`,
    };
  }

  if (input.targetType !== "account" && !UUID_PATTERN.test(input.targetId ?? "")) {
    return {
      status: "not-allowed",
      message: "Zu diesem Inhalt lässt sich kein Widerspruch einlegen.",
    };
  }

  try {
    return await withUser({ user: { id: userId } }, async (_db, client) => {
      // Gehoert der Inhalt ueberhaupt dem Widersprechenden? Ohne diese
      // Pruefung liesse sich gegen fremde Entscheidungen widersprechen.
      if (input.targetType === "letter") {
        const owned = await client.query(
          `SELECT 1 FROM letters
            WHERE id = $1 AND author_id = $2 AND hidden_at IS NOT NULL`,
          [input.targetId, userId],
        );

        if ((owned.rowCount ?? 0) === 0) {
          return {
            status: "not-allowed" as const,
            message: "Zu diesem Inhalt lässt sich kein Widerspruch einlegen.",
          };
        }
      }

      if (input.targetType === "message") {
        const owned = await client.query(
          `SELECT 1 FROM messages
            WHERE id = $1 AND sender_id = $2 AND hidden_at IS NOT NULL`,
          [input.targetId, userId],
        );

        if ((owned.rowCount ?? 0) === 0) {
          return {
            status: "not-allowed" as const,
            message: "Zu diesem Inhalt lässt sich kein Widerspruch einlegen.",
          };
        }
      }

      await client.query(
        `INSERT INTO appeals (appellant_id, target_type, target_id, message)
         VALUES ($1, $2::appeal_target, $3, $4)`,
        [userId, input.targetType, input.targetId, message],
      );

      return { status: "created" as const };
    });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";

    console.error(
      "[appeals] Widerspruch konnte nicht angelegt werden",
      JSON.stringify({
        userId,
        targetType: input.targetType,
        code: code || null,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    if (code === UNIQUE_VIOLATION) {
      return {
        status: "duplicate",
        message:
          "Dein Widerspruch liegt uns bereits vor. Wir sehen ihn uns an, du musst nichts weiter tun.",
      };
    }

    return {
      status: "failed",
      message:
        "Der Widerspruch konnte nicht gespeichert werden. Versuch es gleich noch einmal.",
    };
  }
}

/** Die eigenen Widersprueche samt Entscheidung. */
export async function loadOwnAppeals(
  session: { user?: { id?: string | null } | null } | null,
): Promise<
  { status: "ok"; appeals: OwnAppeal[] } | { status: "failed"; message: string }
> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  try {
    const appeals = await withUser(
      { user: { id: userId } },
      async (_db, client) => {
        const { rows } = await client.query<{
          id: string;
          target_type: AppealTargetType;
          target_id: string | null;
          message: string;
          status: OwnAppeal["status"];
          decision_note: string | null;
          created_at: Date;
        }>(
          `SELECT id, target_type::text, target_id, message, status::text,
                  decision_note, created_at
             FROM appeals
            WHERE appellant_id = $1
            ORDER BY created_at DESC`,
          [userId],
        );

        return rows.map((row) => ({
          id: row.id,
          targetType: row.target_type,
          targetId: row.target_id,
          message: row.message,
          status: row.status,
          decisionNote: row.decision_note,
          createdAt: row.created_at,
        }));
      },
    );

    return { status: "ok", appeals };
  } catch (error) {
    console.error(
      "[appeals] Widersprueche konnten nicht geladen werden",
      JSON.stringify({
        userId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Deine Widersprüche konnten nicht geladen werden. Versuch es gleich noch einmal.",
    };
  }
}
