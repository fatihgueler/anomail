import "server-only";

import { withUser } from "@/lib/db/client";

/**
 * Kontoauflösung und Datenauskunft.
 *
 * Beides sind Betroffenenrechte, die ohnehin erfüllt werden müssen. Der
 * Altbestand meldete bei der Löschung lediglich, die Anfrage sei notiert — im
 * Widerspruch zur eigenen Datenschutzseite, die eine sofortige Löschung
 * zusagt. Hier passiert sie wirklich.
 */

export type DeletionResult =
  | { status: "deleted" }
  | { status: "mismatch"; message: string }
  | { status: "failed"; message: string };

const DB_ERRORS: Record<string, { status: DeletionResult["status"]; message: string }> =
  {
    AN030: {
      status: "failed",
      message: "Du bist nicht mehr angemeldet. Melde dich neu an.",
    },
    AN031: {
      status: "mismatch",
      message:
        "Die eingegebene Anomail-ID stimmt nicht mit deiner überein. Prüfe die Schreibweise und versuch es noch einmal.",
    },
  };

/**
 * Löst das eigene Konto auf.
 *
 * Der gesamte Vorgang läuft in delete_own_account() und damit in einer
 * Transaktion: er passiert vollständig oder gar nicht. Ein halb gelöschtes
 * Konto wäre der schlechteste Ausgang — die Person wäre abgemeldet, ihre Daten
 * aber noch da.
 */
export async function deleteOwnAccount(
  session: { user?: { id?: string | null } | null } | null,
  confirmation: string,
): Promise<DeletionResult> {
  const userId = session?.user?.id;

  if (!userId) {
    return {
      status: "failed",
      message: "Du bist nicht mehr angemeldet. Melde dich neu an.",
    };
  }

  try {
    await withUser({ user: { id: userId } }, async (_db, client) => {
      await client.query(`SELECT delete_own_account($1)`, [confirmation]);
    });

    return { status: "deleted" };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";

    console.error(
      "[account] Loeschung fehlgeschlagen",
      JSON.stringify({
        userId,
        code: code || null,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    const known = DB_ERRORS[code];

    if (known) {
      return { status: known.status, message: known.message } as DeletionResult;
    }

    return {
      status: "failed",
      message:
        "Dein Konto konnte nicht gelöscht werden. Es ist unverändert vorhanden. Versuch es gleich noch einmal.",
    };
  }
}

export type DataExport = {
  erstelltAm: string;
  hinweis: string;
  konto: Record<string, unknown> | null;
  briefe: Array<Record<string, unknown>>;
  nachrichten: Array<Record<string, unknown>>;
  briefwechsel: Array<Record<string, unknown>>;
  meldungen: Array<Record<string, unknown>>;
  blockierungen: Array<Record<string, unknown>>;
  benachrichtigungen: Array<Record<string, unknown>>;
  widersprueche: Array<Record<string, unknown>>;
};

/**
 * Datenauskunft nach Art. 15 DSGVO.
 *
 * Jede Abfrage läuft unter dem Nutzerkontext. Die RLS-Policies entscheiden,
 * was herauskommt — es gibt also keinen Weg, über diesen Export an fremde
 * Daten zu gelangen, auch nicht durch einen Fehler in der Abfrage.
 *
 * Die WHERE-Bedingungen sagen dasselbe noch einmal ausdrücklich.
 */
export async function exportOwnData(
  session: { user?: { id?: string | null } | null } | null,
): Promise<
  { status: "ok"; data: DataExport } | { status: "failed"; message: string }
> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  try {
    const data = await withUser({ user: { id: userId } }, async (_db, client) => {
      const konto = await client.query(
        `SELECT id, email, anomail_id, role, notifications_enabled,
                email_verified, banned_at, banned_reason, created_at
           FROM users WHERE id = $1`,
        [userId],
      );

      const briefe = await client.query(
        `SELECT l.id, l.content, l.status, l.created_at, l.answered_at,
                l.deleted_at, l.hidden_at, l.hidden_reason,
                COALESCE(
                  array_agg(c.label) FILTER (WHERE c.label IS NOT NULL),
                  '{}'
                ) AS kategorien
           FROM letters l
           LEFT JOIN letter_categories lc ON lc.letter_id = l.id
           LEFT JOIN categories c ON c.id = lc.category_id
          WHERE l.author_id = $1
          GROUP BY l.id
          ORDER BY l.created_at`,
        [userId],
      );

      const nachrichten = await client.query(
        `SELECT id, conversation_id, content, is_original, created_at,
                deleted_at, hidden_at, hidden_reason
           FROM messages
          WHERE sender_id = $1
          ORDER BY created_at`,
        [userId],
      );

      const briefwechsel = await client.query(
        `SELECT id, status, created_at, updated_at
           FROM conversations
          WHERE participant_a_id = $1 OR participant_b_id = $1
          ORDER BY created_at`,
        [userId],
      );

      const meldungen = await client.query(
        `SELECT id, target_type, reason, status, resolution_note,
                created_at, resolved_at
           FROM reports
          WHERE reporter_id = $1
          ORDER BY created_at`,
        [userId],
      );

      const blockierungen = await client.query(
        `SELECT blocked_id, created_at FROM blocks
          WHERE blocker_id = $1 ORDER BY created_at`,
        [userId],
      );

      const benachrichtigungen = await client.query(
        `SELECT id, conversation_id, type, read_at, created_at
           FROM notifications
          WHERE recipient_id = $1
          ORDER BY created_at`,
        [userId],
      );

      const widersprueche = await client.query(
        `SELECT id, target_type, target_id, message, status,
                decision_note, created_at, reviewed_at
           FROM appeals
          WHERE appellant_id = $1
          ORDER BY created_at`,
        [userId],
      );

      return {
        erstelltAm: new Date().toISOString(),
        hinweis:
          "Auskunft nach Art. 15 DSGVO. Enthalten sind ausschliesslich Daten, die deinem Konto zugeordnet sind. Nachrichten anderer Personen sind nicht enthalten, auch nicht aus gemeinsamen Briefwechseln.",
        konto: konto.rows[0] ?? null,
        briefe: briefe.rows,
        nachrichten: nachrichten.rows,
        briefwechsel: briefwechsel.rows,
        meldungen: meldungen.rows,
        blockierungen: blockierungen.rows,
        benachrichtigungen: benachrichtigungen.rows,
        widersprueche: widersprueche.rows,
      } satisfies DataExport;
    });

    return { status: "ok", data };
  } catch (error) {
    console.error(
      "[account] Datenauskunft fehlgeschlagen",
      JSON.stringify({
        userId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Der Export konnte nicht erstellt werden. Versuch es gleich noch einmal.",
    };
  }
}
