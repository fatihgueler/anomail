import "server-only";

import { and, eq, gt, sql } from "drizzle-orm";

import { reports } from "@/db/schema";
import { withUser, type Db } from "@/lib/db/client";

/**
 * Melden.
 *
 * Die Berechtigungspruefung steckt bewusst in der Sichtbarkeitsabfrage selbst:
 * gelesen wird unter dem Nutzerkontext, also entscheiden die RLS-Policies, ob
 * der Meldende den Inhalt ueberhaupt kennt. Eine target_id aus dem Request ist
 * damit kein Beleg fuer irgendetwas.
 */

import {
  REPORT_NOTE_MAX_LENGTH,
  REPORT_REASONS,
  isReportReason,
  type ReportReason,
  type ReportTargetType,
} from "./report-reasons";

export type { ReportReason, ReportTargetType };

/** Ratenbegrenzung, damit das Meldesystem kein Werkzeug gegen die Moderation wird. */
export const REPORTS_PER_WINDOW = 10;
export const REPORT_WINDOW_MINUTES = 60;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UNIQUE_VIOLATION = "23505";

export type CreateReportInput = {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  note?: string;
};

export type CreateReportResult =
  | { status: "created"; reportId: string }
  | { status: "duplicate"; message: string }
  | { status: "not-allowed"; message: string }
  | { status: "invalid"; message: string }
  | { status: "rate-limited"; message: string }
  | { status: "failed"; message: string };

type SqlClient = Parameters<Parameters<typeof withUser>[1]>[1];

/**
 * Darf der Meldende diesen Inhalt sehen, und ist er nicht sein eigener?
 *
 * Beides wird hier entschieden, nicht in der Oberflaeche. Der eigene Brief und
 * die eigene Nachricht sind nicht meldbar - im Altsystem ging das.
 */
async function mayReport(
  client: SqlClient,
  userId: string,
  targetType: ReportTargetType,
  targetId: string,
): Promise<{ ok: true; conversationId: string | null } | { ok: false }> {
  if (targetType === "letter") {
    const { rows } = await client.query<{ author_id: string }>(
      `SELECT author_id FROM letters WHERE id = $1`,
      [targetId],
    );

    if (!rows[0] || rows[0].author_id === userId) {
      return { ok: false };
    }

    const conversation = await client.query<{ id: string }>(
      `SELECT id FROM conversations WHERE original_letter_id = $1`,
      [targetId],
    );

    return { ok: true, conversationId: conversation.rows[0]?.id ?? null };
  }

  if (targetType === "message") {
    const { rows } = await client.query<{
      sender_id: string;
      conversation_id: string;
    }>(`SELECT sender_id, conversation_id FROM messages WHERE id = $1`, [
      targetId,
    ]);

    if (!rows[0] || rows[0].sender_id === userId) {
      return { ok: false };
    }

    return { ok: true, conversationId: rows[0].conversation_id };
  }

  const { rows } = await client.query<{
    participant_a_id: string;
    participant_b_id: string;
  }>(
    `SELECT participant_a_id, participant_b_id FROM conversations WHERE id = $1`,
    [targetId],
  );

  // Ein Briefwechsel ist meldbar, wenn man daran beteiligt ist. Die Policy
  // gibt fremde Briefwechsel ohnehin nicht heraus.
  if (!rows[0] || ![rows[0].participant_a_id, rows[0].participant_b_id].includes(userId)) {
    return { ok: false };
  }

  return { ok: true, conversationId: targetId };
}

export async function createReport(
  session: { user?: { id?: string | null; isBanned?: boolean | null } | null } | null,
  input: CreateReportInput,
): Promise<CreateReportResult> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  if (session?.user?.isBanned) {
    return {
      status: "failed",
      message: "Dein Konto ist gesperrt. Du kannst gerade nichts melden.",
    };
  }

  if (!UUID_PATTERN.test(input.targetId)) {
    return {
      status: "not-allowed",
      message: "Diesen Inhalt kannst du nicht melden.",
    };
  }

  if (!isReportReason(input.reason)) {
    return {
      status: "invalid",
      message: "Wähl einen der angebotenen Gründe aus.",
    };
  }

  const note = (input.note ?? "").trim();

  if (note.length > REPORT_NOTE_MAX_LENGTH) {
    return {
      status: "invalid",
      message: `Deine Beschreibung ist zu lang. Kürze sie auf höchstens ${REPORT_NOTE_MAX_LENGTH} Zeichen.`,
    };
  }

  try {
    return await withUser({ user: { id: userId } }, async (db, client) => {
      if (await isRateLimited(db, userId)) {
        return {
          status: "rate-limited" as const,
          message: `Du hast in der letzten Stunde ${REPORTS_PER_WINDOW} Meldungen abgeschickt. Warte etwa eine Stunde, dann geht es weiter.`,
        };
      }

      const permission = await mayReport(
        client,
        userId,
        input.targetType,
        input.targetId,
      );

      if (!permission.ok) {
        // Derselbe Text fuer "gibt es nicht", "darfst du nicht sehen" und
        // "ist dein eigener". Wer nicht darf, soll daraus nichts ableiten.
        return {
          status: "not-allowed" as const,
          message: "Diesen Inhalt kannst du nicht melden.",
        };
      }

      // Der Melder kommt aus der Session, nie aus dem Request.
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO reports (reporter_id, target_type, target_id, conversation_id, reason, status, resolution_note)
         VALUES ($1, $2::target_type, $3, $4, $5::report_reason, 'pending', $6)
         ON CONFLICT (reporter_id, target_type, target_id) DO NOTHING
         RETURNING id`,
        [
          userId,
          input.targetType,
          input.targetId,
          permission.conversationId,
          input.reason,
          note || null,
        ],
      );

      if (!inserted.rows[0]) {
        return {
          status: "duplicate" as const,
          message:
            "Diese Meldung liegt uns bereits vor. Wir sehen sie uns an, du musst nichts weiter tun.",
        };
      }

      return { status: "created" as const, reportId: inserted.rows[0].id };
    });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";

    console.error(
      "[report] Meldung konnte nicht angelegt werden",
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
          "Diese Meldung liegt uns bereits vor. Wir sehen sie uns an, du musst nichts weiter tun.",
      };
    }

    return {
      status: "failed",
      message:
        "Die Meldung konnte nicht gespeichert werden. Versuch es gleich noch einmal.",
    };
  }
}

async function isRateLimited(db: Db, userId: string): Promise<boolean> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reports)
    .where(
      and(
        eq(reports.reporterId, userId),
        gt(
          reports.createdAt,
          sql`now() - (${REPORT_WINDOW_MINUTES}::int * interval '1 minute')`,
        ),
      ),
    );

  return (rows[0]?.count ?? 0) >= REPORTS_PER_WINDOW;
}

export type MyReport = {
  id: string;
  targetType: ReportTargetType;
  reasonLabel: string;
  status: "pending" | "resolved";
  resolutionNote: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  conversationId: string | null;
};

/**
 * Die eigenen Meldungen.
 *
 * Der Digital Services Act verlangt eine Rueckmeldung an den Meldenden
 * (Art. 16) und eine Begruendung bei einer Entscheidung (Art. 17). Diese
 * Ansicht ist die Rueckmeldung; resolution_note befuellt die Moderation.
 */
export async function loadMyReports(
  session: { user?: { id?: string | null } | null } | null,
): Promise<
  { status: "ok"; reports: MyReport[] } | { status: "failed"; message: string }
> {
  const userId = session?.user?.id;

  if (!userId) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  const labels = new Map(
    REPORT_REASONS.map((entry) => [entry.value, entry.label]),
  );

  try {
    const rows = await withUser({ user: { id: userId } }, async (_db, client) => {
      // Die Policy reports_select gibt nur die eigenen Meldungen heraus.
      const result = await client.query<{
        id: string;
        target_type: ReportTargetType;
        reason: ReportReason;
        status: "pending" | "resolved";
        resolution_note: string | null;
        created_at: Date;
        resolved_at: Date | null;
        conversation_id: string | null;
      }>(
        `SELECT id, target_type, reason, status, resolution_note,
                created_at, resolved_at, conversation_id
           FROM reports
          WHERE reporter_id = $1
          ORDER BY created_at DESC`,
        [userId],
      );

      return result.rows;
    });

    return {
      status: "ok",
      reports: rows.map((row) => ({
        id: row.id,
        targetType: row.target_type,
        reasonLabel: labels.get(row.reason) ?? row.reason,
        status: row.status,
        resolutionNote: row.resolution_note,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
        conversationId: row.conversation_id,
      })),
    };
  } catch (error) {
    console.error(
      "[report] Meldungen konnten nicht geladen werden",
      JSON.stringify({
        userId,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Deine Meldungen konnten nicht geladen werden. Versuch es gleich noch einmal.",
    };
  }
}
