"use client";

import { DangerAction } from "@/components/conversation/danger-action";

import { archiveConversationAction } from "./actions";

/**
 * Duenner Client-Wrapper.
 *
 * Die Seite ist eine Server Component und kann keine Funktion als Prop
 * weiterreichen. Die Kennung wandert deshalb als einfacher Wert hierher, und
 * der Aufruf der Serveraktion entsteht erst im Client.
 */
export function ArchiveConversationAction({
  conversationId,
}: {
  conversationId: string;
}) {
  return (
    <DangerAction
      label="Briefwechsel beenden"
      confirmTitle="Diesen Briefwechsel beenden?"
      confirmDescription="Ihr könnt danach beide nichts mehr schreiben. Der bisherige Verlauf bleibt für euch beide sichtbar und wird nicht gelöscht."
      confirmLabel="Ja, beenden"
      action={() => archiveConversationAction(conversationId)}
    />
  );
}
