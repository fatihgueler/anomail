"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  archiveConversation,
  deleteOwnMessage,
  postMessage,
} from "@/lib/actions/conversation";

import type { ComposerState } from "./composer-state";

export async function postMessageAction(
  _previous: ComposerState,
  formData: FormData,
): Promise<ComposerState> {
  const session = await auth();
  const conversationId = String(formData.get("conversationId") ?? "");

  const result = await postMessage(session, {
    conversationId,
    content: String(formData.get("content") ?? ""),
  });

  if (result.status === "ok") {
    revalidatePath(`/conversation/${conversationId}`);
    return { status: "sent", showCrisisNotice: result.showCrisisNotice };
  }

  return { status: result.status, message: result.message };
}

/** Gibt bei Erfolg nichts zurueck, sonst die sichtbare Fehlermeldung. */
export async function deleteMessageAction(
  conversationId: string,
  messageId: string,
): Promise<string | undefined> {
  const session = await auth();
  const result = await deleteOwnMessage(session, messageId);

  if (result.status === "ok") {
    revalidatePath(`/conversation/${conversationId}`);
    return undefined;
  }

  return result.message;
}

export async function archiveConversationAction(
  conversationId: string,
): Promise<string | undefined> {
  const session = await auth();
  const result = await archiveConversation(session, conversationId);

  if (result.status === "ok") {
    revalidatePath(`/conversation/${conversationId}`);
    return undefined;
  }

  return result.message;
}
