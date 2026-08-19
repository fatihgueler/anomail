"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { releaseAssignment, replyToLetter } from "@/lib/actions/listen";

/**
 * Anbindung des Formulars an den Antwort-Vorgang.
 *
 * Hier steht keine Logik: Session holen, weiterreichen, Zustand zurueckgeben.
 * Reihenfolge und Entscheidungen liegen in lib/actions/listen.ts und sind dort
 * ohne Next.js pruefbar.
 */

import type { ReplyFormState } from "./form-state";

export async function submitReplyAction(
  _previous: ReplyFormState,
  formData: FormData,
): Promise<ReplyFormState> {
  const session = await auth();

  const result = await replyToLetter(session, {
    letterId: String(formData.get("letterId") ?? ""),
    content: String(formData.get("content") ?? ""),
  });

  if (result.status === "ok") {
    return { status: "sent", showCrisisNotice: result.showCrisisNotice };
  }

  return { status: result.status, message: result.message };
}

/** Gibt den Brief sofort frei, statt die Lease ablaufen zu lassen. */
export async function releaseAssignmentAction(formData: FormData): Promise<void> {
  const session = await auth();
  await releaseAssignment(session, String(formData.get("letterId") ?? ""));

  // Zurueck auf /listen: dort wird der naechste Brief zugewiesen oder der
  // Leerzustand gezeigt.
  redirect("/listen");
}
