"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { submitAppeal, type AppealTargetType } from "@/lib/actions/appeals";
import {
  hideContent,
  resolveReport,
  reviewAppeal,
  setBan,
  unhideContent,
  updateSafetyCheck,
  type ModerationTargetType,
} from "@/lib/actions/moderation/commands";

/**
 * Anbindung an die Oberflaeche.
 *
 * Hier steht keine Logik: Session holen, weiterreichen, Zustand zurueckgeben.
 * Rollenpruefung und Begruendungspflicht liegen in den Modulen darunter und
 * zusaetzlich in der Datenbank.
 */

const MODERATION_PATHS = [
  "/moderation/reports",
  "/moderation/letters",
  "/moderation/responses",
  "/moderation/safety",
  "/moderation/appeals",
] as const;

function refreshModeration(): void {
  for (const path of MODERATION_PATHS) {
    revalidatePath(path);
  }
}

/** Gibt bei Erfolg nichts zurueck, sonst die sichtbare Fehlermeldung. */
export async function hideContentAction(
  targetType: ModerationTargetType,
  targetId: string,
  reason: string,
): Promise<string | undefined> {
  const session = await auth();
  const result = await hideContent(session, targetType, targetId, reason);

  if (result.status === "ok") {
    refreshModeration();
    return undefined;
  }

  return result.message;
}

export async function unhideContentAction(
  targetType: ModerationTargetType,
  targetId: string,
  reason: string,
): Promise<string | undefined> {
  const session = await auth();
  const result = await unhideContent(session, targetType, targetId, reason);

  if (result.status === "ok") {
    refreshModeration();
    return undefined;
  }

  return result.message;
}

export async function banUserAction(
  userId: string,
  reason: string,
): Promise<string | undefined> {
  const session = await auth();
  const result = await setBan(session, userId, true, reason);

  if (result.status === "ok") {
    refreshModeration();
    return undefined;
  }

  return result.message;
}

export async function unbanUserAction(
  userId: string,
  reason: string,
): Promise<string | undefined> {
  const session = await auth();
  const result = await setBan(session, userId, false, reason);

  if (result.status === "ok") {
    refreshModeration();
    return undefined;
  }

  return result.message;
}

export async function resolveReportAction(
  reportId: string,
  note: string,
): Promise<string | undefined> {
  const session = await auth();
  const result = await resolveReport(session, reportId, note);

  if (result.status === "ok") {
    refreshModeration();
    revalidatePath("/my-reports");
    return undefined;
  }

  return result.message;
}

export async function updateSafetyCheckAction(
  checkId: string,
  status: "reviewing" | "resolved" | "dismissed",
  note: string,
): Promise<string | undefined> {
  const session = await auth();
  const result = await updateSafetyCheck(session, checkId, status, note);

  if (result.status === "ok") {
    refreshModeration();
    return undefined;
  }

  return result.message;
}

export async function reviewAppealAction(
  appealId: string,
  status: "upheld" | "rejected",
  note: string,
): Promise<string | undefined> {
  const session = await auth();
  const result = await reviewAppeal(session, appealId, status, note);

  if (result.status === "ok") {
    refreshModeration();
    return undefined;
  }

  return result.message;
}

/** Widerspruch durch die betroffene Person. Keine Moderationsrolle noetig. */
export async function submitAppealAction(
  targetType: AppealTargetType,
  targetId: string | null,
  message: string,
): Promise<{ ok: boolean; message: string }> {
  const session = await auth();
  const result = await submitAppeal(session, { targetType, targetId, message });

  if (result.status === "created") {
    revalidatePath("/suspended");
    return {
      ok: true,
      message:
        "Dein Widerspruch ist eingegangen. Wir sehen uns die Entscheidung noch einmal an und melden uns.",
    };
  }

  if (result.status === "duplicate") {
    return { ok: true, message: result.message };
  }

  return { ok: false, message: result.message };
}
