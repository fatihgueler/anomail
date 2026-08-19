"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { deleteOwnLetter } from "@/lib/actions/conversation";

/**
 * Anbindung der Loeschaktion an die Oberflaeche.
 * Gibt bei Erfolg nichts zurueck, sonst die Meldung fuer den sichtbaren
 * Fehlerzustand.
 */
export async function deleteLetterAction(
  letterId: string,
): Promise<string | undefined> {
  const session = await auth();
  const result = await deleteOwnLetter(session, letterId);

  if (result.status === "ok") {
    revalidatePath("/my-letters");
    return undefined;
  }

  return result.message;
}
