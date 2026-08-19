import "server-only";

import { withUser } from "@/lib/db/client";

/**
 * Die eingreifenden Aktionen.
 *
 * Jede prueft die Rolle zweimal: hier gegen die Session und noch einmal in der
 * Datenbankfunktion gegen app.is_moderator(). Die Begruendung ist Pflicht und
 * wird ebenfalls in der Datenbank erzwungen - ein Formular laesst sich umgehen,
 * die Funktion nicht.
 */

export type ModerationSession = {
  user?: { id?: string | null; role?: string | null } | null;
} | null;

export type CommandResult =
  | { status: "ok" }
  | { status: "denied"; message: string }
  | { status: "invalid"; message: string }
  | { status: "failed"; message: string };

export type ModerationTargetType = "letter" | "message" | "conversation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DB_ERRORS: Record<string, { status: CommandResult["status"]; message: string }> = {
  AN020: {
    status: "denied",
    message: "Für diese Aktion fehlt dir die Berechtigung.",
  },
  AN021: {
    status: "invalid",
    message:
      "Ohne Begründung geht das nicht. Sie wird der betroffenen Person und dem Melder angezeigt.",
  },
  AN022: {
    status: "invalid",
    message:
      "Der Vorgang wurde nicht gefunden oder ist bereits bearbeitet. Lade die Seite neu.",
  },
  AN023: {
    status: "invalid",
    message: "Dieser Vorgang lässt sich so nicht bearbeiten.",
  },
};

function isModerator(session: ModerationSession): boolean {
  return session?.user?.role === "moderator" || session?.user?.role === "admin";
}

/**
 * Fuehrt eine Datenbankfunktion im Namen des Moderators aus.
 * Die Rollenpruefung hier ist die erste Schranke, nicht die einzige.
 */
async function run(
  session: ModerationSession,
  label: string,
  sql: string,
  params: unknown[],
): Promise<CommandResult> {
  if (!session?.user?.id) {
    return { status: "denied", message: "Du bist nicht mehr angemeldet." };
  }

  if (!isModerator(session)) {
    return {
      status: "denied",
      message: "Für diesen Bereich fehlt dir die Berechtigung.",
    };
  }

  try {
    await withUser({ user: { id: session.user.id } }, async (_db, client) => {
      await client.query(sql, params);
    });

    return { status: "ok" };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";

    console.error(
      `[moderation] ${label} fehlgeschlagen`,
      JSON.stringify({
        actor: session.user.id,
        code: code || null,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    const known = DB_ERRORS[code];

    if (known) {
      return { status: known.status, message: known.message } as CommandResult;
    }

    return {
      status: "failed",
      message:
        "Die Aktion konnte nicht ausgeführt werden. Versuch es gleich noch einmal.",
    };
  }
}

function requireReason(reason: string): CommandResult | null {
  if (reason.trim().length === 0) {
    return {
      status: "invalid",
      message:
        "Ohne Begründung geht das nicht. Sie wird der betroffenen Person und dem Melder angezeigt.",
    };
  }

  return null;
}

export async function hideContent(
  session: ModerationSession,
  targetType: ModerationTargetType,
  targetId: string,
  reason: string,
): Promise<CommandResult> {
  const missing = requireReason(reason);
  if (missing) return missing;

  if (!UUID_PATTERN.test(targetId)) {
    return { status: "invalid", message: "Dieser Vorgang wurde nicht gefunden." };
  }

  return run(session, "hideContent", `SELECT moderation_hide_content($1, $2::uuid, $3)`, [
    targetType,
    targetId,
    reason,
  ]);
}

export async function unhideContent(
  session: ModerationSession,
  targetType: ModerationTargetType,
  targetId: string,
  reason: string,
): Promise<CommandResult> {
  const missing = requireReason(reason);
  if (missing) return missing;

  if (!UUID_PATTERN.test(targetId)) {
    return { status: "invalid", message: "Dieser Vorgang wurde nicht gefunden." };
  }

  return run(
    session,
    "unhideContent",
    `SELECT moderation_unhide_content($1, $2::uuid, $3)`,
    [targetType, targetId, reason],
  );
}

export async function setBan(
  session: ModerationSession,
  userId: string,
  banned: boolean,
  reason: string,
): Promise<CommandResult> {
  const missing = requireReason(reason);
  if (missing) return missing;

  if (!UUID_PATTERN.test(userId)) {
    return { status: "invalid", message: "Dieses Konto wurde nicht gefunden." };
  }

  return run(session, "setBan", `SELECT moderation_set_ban($1::uuid, $2, $3)`, [
    userId,
    banned,
    reason,
  ]);
}

export async function resolveReport(
  session: ModerationSession,
  reportId: string,
  note: string,
): Promise<CommandResult> {
  const missing = requireReason(note);
  if (missing) return missing;

  if (!UUID_PATTERN.test(reportId)) {
    return { status: "invalid", message: "Diese Meldung wurde nicht gefunden." };
  }

  return run(
    session,
    "resolveReport",
    `SELECT moderation_resolve_report($1::uuid, $2)`,
    [reportId, note],
  );
}

export async function updateSafetyCheck(
  session: ModerationSession,
  checkId: string,
  status: "reviewing" | "resolved" | "dismissed",
  note: string,
): Promise<CommandResult> {
  const missing = requireReason(note);
  if (missing) return missing;

  if (!UUID_PATTERN.test(checkId)) {
    return { status: "invalid", message: "Dieser Vorgang wurde nicht gefunden." };
  }

  return run(
    session,
    "updateSafetyCheck",
    `SELECT moderation_update_safety_check($1::uuid, $2::moderation_status, $3)`,
    [checkId, status, note],
  );
}

export async function reviewAppeal(
  session: ModerationSession,
  appealId: string,
  status: "upheld" | "rejected",
  note: string,
): Promise<CommandResult> {
  const missing = requireReason(note);
  if (missing) return missing;

  if (!UUID_PATTERN.test(appealId)) {
    return { status: "invalid", message: "Dieser Widerspruch wurde nicht gefunden." };
  }

  return run(
    session,
    "reviewAppeal",
    `SELECT moderation_review_appeal($1::uuid, $2::appeal_status, $3)`,
    [appealId, status, note],
  );
}
