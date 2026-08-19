import "server-only";

import { withUser } from "@/lib/db/client";

/**
 * Benachrichtigungen.
 *
 * Alle Abfragen laufen unter dem Nutzerkontext; die Policies
 * notifications_select_recipient und notifications_update_recipient geben
 * ausschliesslich eigene Zeilen frei. Eine ID aus dem Request kann daran
 * nichts aendern.
 *
 * Angelegt werden Benachrichtigungen nicht hier, sondern in den Funktionen
 * reply_to_letter() und post_message() - die Anwendungsrolle hat auf
 * notifications gar kein INSERT-Recht.
 */

export type NotificationEntry = {
  id: string;
  conversationId: string;
  partnerAnomailId: string | null;
  createdAt: Date;
  isRead: boolean;
};

export async function loadNotifications(
  session: { user?: { id?: string | null } | null } | null,
): Promise<
  | { status: "ok"; entries: NotificationEntry[]; unread: number }
  | { status: "failed"; message: string }
> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  try {
    return await withUser({ user: { id: userId } }, async (_db, client) => {
      const { rows } = await client.query<{
        id: string;
        conversation_id: string;
        anomail_id: string | null;
        created_at: Date;
        read_at: Date | null;
      }>(
        `SELECT n.id, n.conversation_id, p.anomail_id, n.created_at, n.read_at
           FROM notifications n
           JOIN conversations c ON c.id = n.conversation_id
           LEFT JOIN user_profiles p
                  ON p.id = CASE WHEN c.participant_a_id = $1
                                 THEN c.participant_b_id
                                 ELSE c.participant_a_id END
          WHERE n.recipient_id = $1
          ORDER BY n.created_at DESC`,
        [userId],
      );

      const entries = rows.map((row) => ({
        id: row.id,
        conversationId: row.conversation_id,
        partnerAnomailId: row.anomail_id,
        createdAt: row.created_at,
        isRead: row.read_at !== null,
      }));

      return {
        status: "ok" as const,
        entries,
        unread: entries.filter((entry) => !entry.isRead).length,
      };
    });
  } catch (error) {
    console.error(
      "[notifications] Liste konnte nicht geladen werden",
      JSON.stringify({
        userId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Deine Benachrichtigungen konnten nicht geladen werden. Versuch es gleich noch einmal.",
    };
  }
}

/**
 * Zaehlt die ungelesenen Benachrichtigungen.
 *
 * Gedacht fuer eine Server Component. Bewusst keine Abfrage aus dem Browser
 * in einem Intervall - der Zaehler entsteht beim Rendern.
 */
export async function countUnreadNotifications(
  session: { user?: { id?: string | null } | null } | null,
): Promise<number> {
  const userId = session?.user?.id;

  if (!userId) {
    return 0;
  }

  try {
    return await withUser({ user: { id: userId } }, async (_db, client) => {
      const { rows } = await client.query<{ unread: string }>(
        `SELECT count(*) AS unread
           FROM notifications
          WHERE recipient_id = $1 AND read_at IS NULL`,
        [userId],
      );

      return Number(rows[0].unread);
    });
  } catch (error) {
    console.error(
      "[notifications] Zaehler konnte nicht ermittelt werden",
      JSON.stringify({
        userId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    // Kein Zaehler ist besser als eine erfundene Zahl.
    return 0;
  }
}

export type MarkResult =
  | { status: "ok"; changed: number }
  | { status: "failed"; message: string };

/** Markiert eine einzelne Benachrichtigung als gelesen. */
export async function markNotificationRead(
  session: { user?: { id?: string | null } | null } | null,
  notificationId: string,
): Promise<MarkResult> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  try {
    return await withUser({ user: { id: userId } }, async (_db, client) => {
      const result = await client.query(
        `UPDATE notifications
            SET read_at = now()
          WHERE id = $1 AND recipient_id = $2 AND read_at IS NULL`,
        [notificationId, userId],
      );

      return { status: "ok" as const, changed: result.rowCount ?? 0 };
    });
  } catch (error) {
    console.error(
      "[notifications] Markieren fehlgeschlagen",
      JSON.stringify({
        userId,
        notificationId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Die Benachrichtigung konnte nicht als gelesen markiert werden. Versuch es gleich noch einmal.",
    };
  }
}

export async function markAllNotificationsRead(
  session: { user?: { id?: string | null } | null } | null,
): Promise<MarkResult> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  try {
    return await withUser({ user: { id: userId } }, async (_db, client) => {
      const result = await client.query(
        `UPDATE notifications
            SET read_at = now()
          WHERE recipient_id = $1 AND read_at IS NULL`,
        [userId],
      );

      return { status: "ok" as const, changed: result.rowCount ?? 0 };
    });
  } catch (error) {
    console.error(
      "[notifications] Alle markieren fehlgeschlagen",
      JSON.stringify({
        userId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Die Benachrichtigungen konnten nicht als gelesen markiert werden. Versuch es gleich noch einmal.",
    };
  }
}

export type PreferenceResult =
  | { status: "ok"; enabled: boolean }
  | { status: "failed"; message: string };

export async function loadNotificationPreference(
  session: { user?: { id?: string | null } | null } | null,
): Promise<PreferenceResult> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  try {
    return await withUser({ user: { id: userId } }, async (_db, client) => {
      const { rows } = await client.query<{ notifications_enabled: boolean }>(
        `SELECT notifications_enabled FROM users WHERE id = $1`,
        [userId],
      );

      return { status: "ok" as const, enabled: rows[0]?.notifications_enabled ?? true };
    });
  } catch (error) {
    console.error(
      "[notifications] Einstellung konnte nicht gelesen werden",
      JSON.stringify({
        userId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Die Einstellung konnte nicht geladen werden. Versuch es gleich noch einmal.",
    };
  }
}

export async function setNotificationPreference(
  session: { user?: { id?: string | null } | null } | null,
  enabled: boolean,
): Promise<PreferenceResult> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  try {
    return await withUser({ user: { id: userId } }, async (_db, client) => {
      // Die Policy users_update_self laesst nur die eigene Zeile zu, und das
      // Spaltenrecht aus Migration 0028 nur diese eine Spalte.
      await client.query(
        `UPDATE users
            SET notifications_enabled = $2,
                updated_at = now()
          WHERE id = $1`,
        [userId, enabled],
      );

      return { status: "ok" as const, enabled };
    });
  } catch (error) {
    console.error(
      "[notifications] Einstellung konnte nicht gespeichert werden",
      JSON.stringify({
        userId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Die Einstellung konnte nicht gespeichert werden. Versuch es gleich noch einmal.",
    };
  }
}
