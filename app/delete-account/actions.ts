"use server";

import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { deleteOwnAccount } from "@/lib/actions/account";

import type { DeleteFormState } from "./form-state";

/**
 * Anbindung des Löschformulars.
 *
 * Nach der Löschung wird die Sitzung auch clientseitig beendet. Die
 * Sitzungszeilen sind in der Transaktion bereits entfernt worden — das
 * Abmelden räumt nur noch das Cookie weg, damit der Browser nicht mit einem
 * toten Zeiger zurückbleibt.
 */
export async function deleteAccountAction(
  _previous: DeleteFormState,
  formData: FormData,
): Promise<DeleteFormState> {
  const session = await auth();

  const bestaetigt = formData.get("bestaetigt") === "ja";
  const kennung = String(formData.get("anomailId") ?? "");

  // Serverseitig geprüft, nicht nur im Formular.
  if (!bestaetigt) {
    return {
      status: "invalid",
      message:
        "Setz den Haken, um zu bestätigen, dass du dein Konto löschen möchtest.",
    };
  }

  if (kennung.trim().length === 0) {
    return {
      status: "invalid",
      message: "Trag deine Anomail-ID ein, um die Löschung zu bestätigen.",
    };
  }

  const result = await deleteOwnAccount(session, kennung);

  if (result.status === "deleted") {
    await signOut({ redirect: false });
    redirect("/account-geloescht");
  }

  return { status: result.status, message: result.message };
}
