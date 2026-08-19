"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { blockUser, unblockUser } from "@/lib/actions/block";
import {
  markAllNotificationsRead,
  markNotificationRead,
  setNotificationPreference,
} from "@/lib/actions/notifications";
import {
  createReport,
  type CreateReportInput,
  type ReportTargetType,
} from "@/lib/actions/report";

/**
 * Anbindung an die Oberflaeche.
 *
 * Hier steht keine Logik: Session holen, weiterreichen, Zustand zurueckgeben.
 * Jede Berechtigungspruefung liegt in den Modulen darunter und ist dort ohne
 * Next.js pruefbar.
 */

export type ReportOutcomeState = {
  status: "created" | "duplicate" | "not-allowed" | "invalid" | "rate-limited" | "failed";
  message: string;
};

export async function reportAction(
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
  note: string,
): Promise<ReportOutcomeState> {
  const session = await auth();

  const input: CreateReportInput = { targetType, targetId, reason, note };
  const result = await createReport(session, input);

  if (result.status === "created") {
    revalidatePath("/my-reports");
    return {
      status: "created",
      message:
        "Wir prüfen deine Meldung. Der gemeldete Inhalt bleibt vorerst sichtbar. Den Stand findest du unter Meine Meldungen.",
    };
  }

  return { status: result.status, message: result.message };
}

export async function blockAction(blockedId: string): Promise<string | undefined> {
  const session = await auth();
  const result = await blockUser(session, blockedId);

  if (result.status === "ok") {
    revalidatePath("/blocked");
    return undefined;
  }

  return result.message;
}

export async function unblockAction(
  blockedId: string,
): Promise<string | undefined> {
  const session = await auth();
  const result = await unblockUser(session, blockedId);

  if (result.status === "ok") {
    revalidatePath("/blocked");
    return undefined;
  }

  return result.message;
}

export async function markReadAction(
  notificationId: string,
): Promise<string | undefined> {
  const session = await auth();
  const result = await markNotificationRead(session, notificationId);

  if (result.status === "ok") {
    revalidatePath("/notifications");
    return undefined;
  }

  return result.message;
}

export async function markAllReadAction(): Promise<string | undefined> {
  const session = await auth();
  const result = await markAllNotificationsRead(session);

  if (result.status === "ok") {
    revalidatePath("/notifications");
    return undefined;
  }

  return result.message;
}

export async function setNotificationPreferenceAction(
  enabled: boolean,
): Promise<string | undefined> {
  const session = await auth();
  const result = await setNotificationPreference(session, enabled);

  if (result.status === "ok") {
    revalidatePath("/settings");
    return undefined;
  }

  return result.message;
}
