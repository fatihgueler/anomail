"use server";

import { auth } from "@/auth";
import { submitLetter } from "@/lib/actions/write-letter";

/**
 * Anbindung des Formulars an den Absendevorgang.
 *
 * Hier steht bewusst keine Logik: Session holen, weiterreichen, Zustand
 * zurueckgeben. Die Reihenfolge und jede Entscheidung liegen in
 * lib/actions/write-letter.ts und sind dort ohne Next.js pruefbar.
 */

import type { WriteFormState } from "./form-state";

export async function submitLetterAction(
  _previous: WriteFormState,
  formData: FormData,
): Promise<WriteFormState> {
  const session = await auth();

  const content = String(formData.get("content") ?? "");
  const submissionId = String(formData.get("submissionId") ?? "");
  const categorySlugs = formData
    .getAll("categories")
    .map((entry) => String(entry))
    .filter(Boolean);

  const result = await submitLetter(session, {
    content,
    categorySlugs,
    submissionId,
  });

  if (result.status === "ok") {
    return {
      status: "sent",
      showCrisisNotice: result.showCrisisNotice,
    };
  }

  if (result.status === "invalid") {
    return { status: "invalid", message: result.message, field: result.field };
  }

  if (result.status === "rate-limited") {
    return { status: "rate-limited", message: result.message };
  }

  return { status: "failed", message: result.message };
}
