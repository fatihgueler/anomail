import "server-only";

import { withUser } from "@/lib/db/client";

/**
 * Die Warteschlangen der Moderation.
 *
 * Zwei Dinge gelten hier durchgehend:
 *
 * 1. Sichtbar ist ausschliesslich, was durch eine Meldung oder eine
 *    Sicherheitspruefung in die Warteschlange gelangt ist. Es gibt keine
 *    Abfrage, die Briefe oder Gespraeche frei durchsucht oder blaettert.
 * 2. Die E-Mail-Adresse taucht in keiner Abfrage auf. Identifikation laeuft
 *    ausschliesslich ueber die Anomail-ID aus user_profiles.
 *
 * Jeder angezeigte fremde Inhalt wird protokolliert - siehe recordViews().
 */

export const PAGE_SIZE = 20;

export type ModerationSession = {
  user?: { id?: string | null; role?: string | null } | null;
} | null;

export type QueueFailure = { status: "failed"; message: string };

function isModerator(session: ModerationSession): boolean {
  return session?.user?.role === "moderator" || session?.user?.role === "admin";
}

/**
 * Rollenpruefung vor jeder Abfrage.
 *
 * Die Route prueft ebenfalls, aber diese Ebene wird auch von Server Actions
 * aufgerufen - und dort gibt es keine Route, die vorher greifen koennte.
 */
function guard(session: ModerationSession): QueueFailure | null {
  if (!session?.user?.id) {
    return { status: "failed", message: "Du bist nicht mehr angemeldet." };
  }

  if (!isModerator(session)) {
    return {
      status: "failed",
      message: "Für diesen Bereich fehlt dir die Berechtigung.",
    };
  }

  return null;
}

type SqlClient = Parameters<Parameters<typeof withUser>[1]>[1];

/**
 * Haelt fest, welche fremden Inhalte angesehen wurden.
 * Eine Zeile je Eintrag, in derselben Transaktion wie die Abfrage.
 */
async function recordViews(
  client: SqlClient,
  targets: Array<{ targetType: string; targetId: string }>,
): Promise<void> {
  for (const target of targets) {
    await client.query(`SELECT moderation_record_view($1, $2::uuid)`, [
      target.targetType,
      target.targetId,
    ]);
  }
}

export type CrisisSummary = { open: number; oldestMinutes: number | null };

/** Offene CRISIS-Faelle. Steht im Kopf jedes Tabs. */
export async function loadCrisisSummary(
  session: ModerationSession,
): Promise<CrisisSummary> {
  if (guard(session)) {
    return { open: 0, oldestMinutes: null };
  }

  try {
    return await withUser(
      { user: { id: session!.user!.id! } },
      async (_db, client) => {
        const { rows } = await client.query<{
          open: string;
          oldest: string | null;
        }>(
          `SELECT count(*) AS open,
                  EXTRACT(EPOCH FROM (now() - min(created_at))) / 60 AS oldest
             FROM safety_checks
            WHERE risk_level = 'CRISIS'
              AND moderation_status IN ('open', 'reviewing')`,
        );

        return {
          open: Number(rows[0].open),
          oldestMinutes: rows[0].oldest ? Math.round(Number(rows[0].oldest)) : null,
        };
      },
    );
  } catch (error) {
    console.error("[moderation] CRISIS-Zaehler nicht ermittelbar", error);
    return { open: 0, oldestMinutes: null };
  }
}

/* ------------------------------------------------------------------ */
/* Meldungen                                                           */
/* ------------------------------------------------------------------ */

export type ReportContextMessage = {
  id: string;
  authorAnomailId: string | null;
  content: string;
  createdAt: Date;
  isTarget: boolean;
};

export type ModerationReport = {
  id: string;
  reason: string;
  status: "pending" | "resolved";
  createdAt: Date;
  reporterAnomailId: string | null;
  targetType: "letter" | "message" | "conversation";
  targetId: string;
  targetContent: string | null;
  targetAuthorId: string | null;
  targetAuthorAnomailId: string | null;
  note: string | null;
  resolutionNote: string | null;
  /** Wie viele Personen denselben Inhalt gemeldet haben. */
  reportCount: number;
  context: ReportContextMessage[];
};

export type ReportFilters = {
  status?: "pending" | "resolved" | "all";
  reason?: string;
  page?: number;
};

export async function loadReportQueue(
  session: ModerationSession,
  filters: ReportFilters = {},
): Promise<
  { status: "ok"; reports: ModerationReport[]; total: number } | QueueFailure
> {
  const blocked = guard(session);
  if (blocked) return blocked;

  const page = Math.max(1, filters.page ?? 1);
  const statusFilter = filters.status ?? "pending";

  try {
    return await withUser(
      { user: { id: session!.user!.id! } },
      async (_db, client) => {
        // Mehrfachmeldungen desselben Inhalts werden zu einem Eintrag
        // zusammengefasst. Angezeigt wird die aelteste offene Meldung.
        const { rows } = await client.query<{
          id: string;
          reason: string;
          status: "pending" | "resolved";
          created_at: Date;
          reporter_anomail_id: string | null;
          target_type: ModerationReport["targetType"];
          target_id: string;
          note: string | null;
          resolution_note: string | null;
          report_count: string;
          total: string;
        }>(
          `WITH gefiltert AS (
             SELECT r.*,
                    count(*) OVER (PARTITION BY r.target_type, r.target_id) AS report_count,
                    row_number() OVER (
                      PARTITION BY r.target_type, r.target_id
                      ORDER BY r.created_at ASC
                    ) AS rang
               FROM reports r
              WHERE ($1 = 'all' OR r.status::text = $1)
                AND ($2::text IS NULL OR r.reason::text = $2)
           ),
           gebuendelt AS (
             SELECT * FROM gefiltert WHERE rang = 1
           )
           SELECT g.id, g.reason::text, g.status::text, g.created_at,
                  p.anomail_id AS reporter_anomail_id,
                  g.target_type::text, g.target_id,
                  g.resolution_note,
                  NULL::text AS note,
                  g.report_count::text,
                  count(*) OVER () ::text AS total
             FROM gebuendelt g
             LEFT JOIN user_profiles p ON p.id = g.reporter_id
            ORDER BY (g.status = 'pending') DESC, g.created_at ASC
            LIMIT $3 OFFSET $4`,
          [
            statusFilter,
            filters.reason ?? null,
            PAGE_SIZE,
            (page - 1) * PAGE_SIZE,
          ],
        );

        const reports: ModerationReport[] = [];

        for (const row of rows) {
          const detail = await loadTarget(client, row.target_type, row.target_id);

          reports.push({
            id: row.id,
            reason: row.reason,
            status: row.status,
            createdAt: row.created_at,
            reporterAnomailId: row.reporter_anomail_id,
            targetType: row.target_type,
            targetId: row.target_id,
            targetContent: detail.content,
            targetAuthorId: detail.authorId,
            targetAuthorAnomailId: detail.authorAnomailId,
            note: row.note,
            resolutionNote: row.resolution_note,
            reportCount: Number(row.report_count),
            context: detail.context,
          });
        }

        await recordViews(
          client,
          reports.map((report) => ({
            targetType: report.targetType,
            targetId: report.targetId,
          })),
        );

        return {
          status: "ok" as const,
          reports,
          total: rows[0] ? Number(rows[0].total) : 0,
        };
      },
    );
  } catch (error) {
    console.error(
      "[moderation] Meldungen konnten nicht geladen werden",
      JSON.stringify({
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Die Meldungen konnten nicht geladen werden. Versuch es gleich noch einmal.",
    };
  }
}

/**
 * Laedt den gemeldeten Inhalt.
 *
 * Bei einer Nachricht kommen zwei vorangehende und zwei folgende Nachrichten
 * als Kontext dazu - ausdruecklich nicht das gesamte Gespraech.
 */
async function loadTarget(
  client: SqlClient,
  targetType: ModerationReport["targetType"],
  targetId: string,
): Promise<{
  content: string | null;
  authorId: string | null;
  authorAnomailId: string | null;
  context: ReportContextMessage[];
}> {
  if (targetType === "letter") {
    const { rows } = await client.query<{
      content: string;
      author_id: string;
      anomail_id: string | null;
    }>(
      `SELECT l.content, l.author_id, p.anomail_id
         FROM letters l
         LEFT JOIN user_profiles p ON p.id = l.author_id
        WHERE l.id = $1`,
      [targetId],
    );

    return {
      content: rows[0]?.content ?? null,
      authorId: rows[0]?.author_id ?? null,
      authorAnomailId: rows[0]?.anomail_id ?? null,
      context: [],
    };
  }

  if (targetType === "message") {
    const { rows } = await client.query<{
      id: string;
      content: string;
      sender_id: string;
      anomail_id: string | null;
      created_at: Date;
      is_target: boolean;
    }>(
      `WITH ziel AS (
         SELECT conversation_id, created_at, id FROM messages WHERE id = $1
       ),
       davor AS (
         SELECT m.* FROM messages m, ziel z
          WHERE m.conversation_id = z.conversation_id
            AND (m.created_at, m.id) < (z.created_at, z.id)
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT 2
       ),
       danach AS (
         SELECT m.* FROM messages m, ziel z
          WHERE m.conversation_id = z.conversation_id
            AND (m.created_at, m.id) > (z.created_at, z.id)
          ORDER BY m.created_at ASC, m.id ASC
          LIMIT 2
       ),
       zusammen AS (
         SELECT * FROM davor
         UNION ALL SELECT m.* FROM messages m WHERE m.id = $1
         UNION ALL SELECT * FROM danach
       )
       SELECT z.id, z.content, z.sender_id, p.anomail_id, z.created_at,
              (z.id = $1) AS is_target
         FROM zusammen z
         LEFT JOIN user_profiles p ON p.id = z.sender_id
        ORDER BY z.created_at ASC, z.id ASC`,
      [targetId],
    );

    const target = rows.find((row) => row.is_target);

    return {
      content: target?.content ?? null,
      authorId: target?.sender_id ?? null,
      authorAnomailId: target?.anomail_id ?? null,
      context: rows.map((row) => ({
        id: row.id,
        authorAnomailId: row.anomail_id,
        content: row.content,
        createdAt: row.created_at,
        isTarget: row.is_target,
      })),
    };
  }

  // Gespraech: gemeldet ist der Verlauf als Ganzes. Angezeigt wird die
  // Ursprungsnachricht als Einstieg, nicht der komplette Verlauf.
  const { rows } = await client.query<{
    content: string;
    sender_id: string;
    anomail_id: string | null;
  }>(
    `SELECT m.content, m.sender_id, p.anomail_id
       FROM messages m
       LEFT JOIN user_profiles p ON p.id = m.sender_id
      WHERE m.conversation_id = $1 AND m.is_original
      LIMIT 1`,
    [targetId],
  );

  return {
    content: rows[0]?.content ?? null,
    authorId: rows[0]?.sender_id ?? null,
    authorAnomailId: rows[0]?.anomail_id ?? null,
    context: [],
  };
}

/* ------------------------------------------------------------------ */
/* Briefe und Antworten                                                */
/* ------------------------------------------------------------------ */

export type FlaggedItem = {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  authorAnomailId: string | null;
  hiddenAt: Date | null;
  hiddenReason: string | null;
  status: string | null;
  safetyRiskLevel: string | null;
  safetyReasoning: string | null;
};

/** Briefe mit status flagged oder gesetztem hidden_at. */
export async function loadFlaggedLetters(
  session: ModerationSession,
  page = 1,
): Promise<{ status: "ok"; items: FlaggedItem[]; total: number } | QueueFailure> {
  return loadFlagged(session, "letter", page);
}

/** Nachrichten mit gesetztem hidden_at. */
export async function loadHiddenMessages(
  session: ModerationSession,
  page = 1,
): Promise<{ status: "ok"; items: FlaggedItem[]; total: number } | QueueFailure> {
  return loadFlagged(session, "message", page);
}

async function loadFlagged(
  session: ModerationSession,
  kind: "letter" | "message",
  page: number,
): Promise<{ status: "ok"; items: FlaggedItem[]; total: number } | QueueFailure> {
  const blocked = guard(session);
  if (blocked) return blocked;

  const offset = (Math.max(1, page) - 1) * PAGE_SIZE;

  try {
    return await withUser(
      { user: { id: session!.user!.id! } },
      async (_db, client) => {
        const sql =
          kind === "letter"
            ? `SELECT l.id, l.content, l.created_at, l.author_id, p.anomail_id,
                      l.hidden_at, l.hidden_reason, l.status::text AS status,
                      s.risk_level::text AS risk_level, s.reasoning,
                      count(*) OVER () ::text AS total
                 FROM letters l
                 LEFT JOIN user_profiles p ON p.id = l.author_id
                 LEFT JOIN safety_checks s
                        ON s.target_type = 'letter' AND s.target_id = l.id
                WHERE l.status = 'flagged' OR l.hidden_at IS NOT NULL
                ORDER BY l.created_at DESC
                LIMIT $1 OFFSET $2`
            : `SELECT m.id, m.content, m.created_at, m.sender_id AS author_id,
                      p.anomail_id, m.hidden_at, m.hidden_reason,
                      NULL::text AS status,
                      s.risk_level::text AS risk_level, s.reasoning,
                      count(*) OVER () ::text AS total
                 FROM messages m
                 LEFT JOIN user_profiles p ON p.id = m.sender_id
                 LEFT JOIN safety_checks s
                        ON s.target_type = 'message' AND s.target_id = m.id
                WHERE m.hidden_at IS NOT NULL
                ORDER BY m.created_at DESC
                LIMIT $1 OFFSET $2`;

        const { rows } = await client.query<{
          id: string;
          content: string;
          created_at: Date;
          author_id: string;
          anomail_id: string | null;
          hidden_at: Date | null;
          hidden_reason: string | null;
          status: string | null;
          risk_level: string | null;
          reasoning: string | null;
          total: string;
        }>(sql, [PAGE_SIZE, offset]);

        const items = rows.map((row) => ({
          id: row.id,
          content: row.content,
          createdAt: row.created_at,
          authorId: row.author_id,
          authorAnomailId: row.anomail_id,
          hiddenAt: row.hidden_at,
          hiddenReason: row.hidden_reason,
          status: row.status,
          safetyRiskLevel: row.risk_level,
          safetyReasoning: row.reasoning,
        }));

        await recordViews(
          client,
          items.map((item) => ({ targetType: kind, targetId: item.id })),
        );

        return {
          status: "ok" as const,
          items,
          total: rows[0] ? Number(rows[0].total) : 0,
        };
      },
    );
  } catch (error) {
    console.error(
      `[moderation] ${kind}-Warteschlange nicht ladbar`,
      JSON.stringify({
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Die Liste konnte nicht geladen werden. Versuch es gleich noch einmal.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Sicherheitspruefungen                                               */
/* ------------------------------------------------------------------ */

export type SafetyEntry = {
  id: string;
  targetType: string;
  targetId: string | null;
  senderId: string;
  senderAnomailId: string | null;
  contentSnapshot: string;
  riskLevel: "GREEN" | "YELLOW" | "RED" | "CRISIS";
  detectedCategories: string[];
  reasoning: string;
  shouldHold: boolean;
  moderationStatus: "open" | "reviewing" | "resolved" | "dismissed";
  createdAt: Date;
  waitingMinutes: number;
};

export async function loadSafetyQueue(
  session: ModerationSession,
  page = 1,
): Promise<{ status: "ok"; items: SafetyEntry[]; total: number } | QueueFailure> {
  const blocked = guard(session);
  if (blocked) return blocked;

  const offset = (Math.max(1, page) - 1) * PAGE_SIZE;

  try {
    return await withUser(
      { user: { id: session!.user!.id! } },
      async (_db, client) => {
        // CRISIS steht immer oben, unabhaengig von Alter und Seite.
        const { rows } = await client.query<{
          id: string;
          target_type: string;
          target_id: string | null;
          sender_id: string;
          anomail_id: string | null;
          content_snapshot: string;
          risk_level: SafetyEntry["riskLevel"];
          detected_categories: string[];
          reasoning: string;
          should_hold: boolean;
          moderation_status: SafetyEntry["moderationStatus"];
          created_at: Date;
          waiting: string;
          total: string;
        }>(
          `SELECT s.id, s.target_type::text, s.target_id, s.sender_id,
                  p.anomail_id, s.content_snapshot, s.risk_level::text,
                  s.detected_categories, s.reasoning, s.should_hold,
                  s.moderation_status::text, s.created_at,
                  (EXTRACT(EPOCH FROM (now() - s.created_at)) / 60)::int ::text AS waiting,
                  count(*) OVER () ::text AS total
             FROM safety_checks s
             LEFT JOIN user_profiles p ON p.id = s.sender_id
            ORDER BY CASE s.risk_level
                       WHEN 'CRISIS' THEN 0
                       WHEN 'RED'    THEN 1
                       WHEN 'YELLOW' THEN 2
                       ELSE 3
                     END,
                     s.created_at ASC
            LIMIT $1 OFFSET $2`,
          [PAGE_SIZE, offset],
        );

        const items = rows.map((row) => ({
          id: row.id,
          targetType: row.target_type,
          targetId: row.target_id,
          senderId: row.sender_id,
          senderAnomailId: row.anomail_id,
          contentSnapshot: row.content_snapshot,
          riskLevel: row.risk_level,
          detectedCategories: row.detected_categories ?? [],
          reasoning: row.reasoning,
          shouldHold: row.should_hold,
          moderationStatus: row.moderation_status,
          createdAt: row.created_at,
          waitingMinutes: Number(row.waiting),
        }));

        await recordViews(
          client,
          items.map((item) => ({
            targetType: "safety_check",
            targetId: item.id,
          })),
        );

        return {
          status: "ok" as const,
          items,
          total: rows[0] ? Number(rows[0].total) : 0,
        };
      },
    );
  } catch (error) {
    console.error(
      "[moderation] Sicherheitspruefungen nicht ladbar",
      JSON.stringify({
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Die Sicherheitsprüfungen konnten nicht geladen werden. Versuch es gleich noch einmal.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Widersprueche und Protokoll                                         */
/* ------------------------------------------------------------------ */

export type ModerationAppeal = {
  id: string;
  appellantAnomailId: string | null;
  targetType: "letter" | "message" | "account";
  targetId: string | null;
  message: string;
  status: "open" | "upheld" | "rejected";
  decisionNote: string | null;
  createdAt: Date;
};

export async function loadAppealQueue(
  session: ModerationSession,
): Promise<
  { status: "ok"; appeals: ModerationAppeal[] } | QueueFailure
> {
  const blocked = guard(session);
  if (blocked) return blocked;

  try {
    return await withUser(
      { user: { id: session!.user!.id! } },
      async (_db, client) => {
        const { rows } = await client.query<{
          id: string;
          anomail_id: string | null;
          target_type: ModerationAppeal["targetType"];
          target_id: string | null;
          message: string;
          status: ModerationAppeal["status"];
          decision_note: string | null;
          created_at: Date;
        }>(
          `SELECT a.id, p.anomail_id, a.target_type::text, a.target_id,
                  a.message, a.status::text, a.decision_note, a.created_at
             FROM appeals a
             LEFT JOIN user_profiles p ON p.id = a.appellant_id
            ORDER BY (a.status = 'open') DESC, a.created_at ASC
            LIMIT 100`,
        );

        return {
          status: "ok" as const,
          appeals: rows.map((row) => ({
            id: row.id,
            appellantAnomailId: row.anomail_id,
            targetType: row.target_type,
            targetId: row.target_id,
            message: row.message,
            status: row.status,
            decisionNote: row.decision_note,
            createdAt: row.created_at,
          })),
        };
      },
    );
  } catch (error) {
    console.error(
      "[moderation] Widersprueche nicht ladbar",
      JSON.stringify({
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Die Widersprüche konnten nicht geladen werden. Versuch es gleich noch einmal.",
    };
  }
}

export type AuditRow = {
  id: string;
  actorAnomailId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  note: string | null;
  createdAt: Date;
};

/** Nur fuer role admin. Die Policy gibt Moderatoren nichts heraus. */
export async function loadAuditLog(
  session: ModerationSession,
  page = 1,
): Promise<{ status: "ok"; rows: AuditRow[]; total: number } | QueueFailure> {
  if (session?.user?.role !== "admin") {
    return {
      status: "failed",
      message: "Das Prüfprotokoll ist ausschließlich für Admins einsehbar.",
    };
  }

  const offset = (Math.max(1, page) - 1) * PAGE_SIZE;

  try {
    return await withUser(
      { user: { id: session.user.id! } },
      async (_db, client) => {
        const { rows } = await client.query<{
          id: string;
          anomail_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          note: string | null;
          created_at: Date;
          total: string;
        }>(
          `SELECT a.id, p.anomail_id, a.action::text, a.target_type,
                  a.target_id, a.note, a.created_at,
                  count(*) OVER () ::text AS total
             FROM moderation_audit_log a
             LEFT JOIN user_profiles p ON p.id = a.actor_id
            ORDER BY a.created_at DESC
            LIMIT $1 OFFSET $2`,
          [PAGE_SIZE, offset],
        );

        return {
          status: "ok" as const,
          rows: rows.map((row) => ({
            id: row.id,
            actorAnomailId: row.anomail_id,
            action: row.action,
            targetType: row.target_type,
            targetId: row.target_id,
            note: row.note,
            createdAt: row.created_at,
          })),
          total: rows[0] ? Number(rows[0].total) : 0,
        };
      },
    );
  } catch (error) {
    console.error(
      "[moderation] Pruefprotokoll nicht ladbar",
      JSON.stringify({
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      status: "failed",
      message:
        "Das Prüfprotokoll konnte nicht geladen werden. Versuch es gleich noch einmal.",
    };
  }
}
