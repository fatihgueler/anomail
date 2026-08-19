import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { loadConversation } from "@/lib/actions/conversation";
import { requireActiveUser } from "@/lib/auth/guard";
import { cn } from "@/lib/utils";

import { ArchiveConversationAction } from "./archive-action";
import {
  BlockPartnerButton,
  ReportConversationButton,
} from "./conversation-actions";
import { MessageComposer } from "./message-composer";
import { MessageList, type DisplayMessage } from "./message-list";

export const metadata: Metadata = {
  title: "Briefwechsel",
};

export const dynamic = "force-dynamic";

const timeFormat = new Intl.DateTimeFormat("de-DE", { timeStyle: "short" });
const dayFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" });

type ConversationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { id } = await params;
  const session = await requireActiveUser(`/conversation/${id}`);

  // Teilnehmerpruefung steckt in loadConversation und verlaesst sich nicht
  // allein auf RLS: eine fremde Kennung ergibt einen erklaerten Zustand.
  const result = await loadConversation(session, id);

  if (result.status !== "ok") {
    return (
      <main id="hauptinhalt" className="mx-auto flex max-w-shell flex-col gap-8 p-8">
        <h1 className="text-display">Briefwechsel</h1>

        <div
          role="alert"
          className="flex max-w-prose flex-col items-start gap-4 rounded-lg border border-input bg-card p-6"
        >
          <h2 className="text-subtitle text-card-foreground">
            {result.status === "not-found"
              ? "Dieser Briefwechsel ist für dich nicht verfügbar"
              : "Der Briefwechsel konnte nicht geladen werden"}
          </h2>
          <p className="text-body text-muted-foreground">{result.message}</p>

          <Link
            href="/my-letters"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "whitespace-nowrap",
            )}
          >
            Zu meinen Briefen
          </Link>
        </div>
      </main>
    );
  }

  const partnerLabel = result.data.partnerAnomailId ?? "Unbekannt";

  /*
   * Der Text im Kopf und der Ersatz fuer das Eingabefeld.
   *
   * Wer blockiert wurde, bekommt denselben neutralen Text wie bei jedem
   * anderen geschlossenen Briefwechsel. Nur die blockierende Seite sieht, dass
   * sie blockiert hat - sonst liesse sich die Blockierung ablesen.
   */
  const closedNotice =
    result.data.closedReason === "blocked-by-you"
      ? "Du hast diese Person blockiert."
      : result.data.closedReason !== null
        ? "In diesem Briefwechsel sind keine neuen Nachrichten mehr möglich."
        : null;

  const closedExplanation =
    result.data.closedReason === "blocked-by-you"
      ? "Du hast diese Person blockiert. Ihr könnt einander nicht mehr schreiben. Der Verlauf bleibt für euch beide lesbar."
      : "In diesem Briefwechsel sind keine neuen Nachrichten mehr möglich. Der Verlauf bleibt für euch beide lesbar.";

  const messages: DisplayMessage[] = result.data.messages.map((message) => ({
    id: message.id,
    content: message.content,
    isOriginal: message.isOriginal,
    isOwn: message.isOwn,
    isDeleted: message.isDeleted,
    isHeld: message.isHeld,
    hiddenReason: message.hiddenReason,
    createdAtIso: message.createdAt.toISOString(),
    timeLabel: timeFormat.format(message.createdAt),
    dayLabel: dayFormat.format(message.createdAt),
  }));

  return (
    <main id="hauptinhalt" className="mx-auto flex max-w-shell flex-col gap-8 p-8">
      <header className="flex max-w-prose flex-col gap-3">
        <h1 className="text-display">Briefwechsel</h1>

        {/*
          Die Kennung des Gegenübers steht im Kopfbereich. Im Altsystem tauchte
          sie nirgends auf, obwohl sie das einzige Identitätsmerkmal ist.
        */}
        <p className="text-body text-muted-foreground">
          Mit{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {partnerLabel}
          </span>
        </p>

        {closedNotice ? (
          <p className="text-small text-muted-foreground">{closedNotice}</p>
        ) : null}
      </header>

      <section aria-labelledby="verlauf" className="flex flex-col gap-6">
        <h2 id="verlauf" className="sr-only">
          Verlauf
        </h2>

        <MessageList
          conversationId={result.data.id}
          messages={messages}
          ownLabel="Du"
          partnerLabel={partnerLabel}
        />
      </section>

      <section aria-labelledby="schreiben" className="flex flex-col gap-4">
        <h2 id="schreiben" className="text-title">
          {result.data.canWrite ? "Antworten" : "Beendet"}
        </h2>

        {result.data.canWrite ? (
          <MessageComposer conversationId={result.data.id} />
        ) : (
          // Das Eingabefeld wird ersetzt, nicht kommentarlos entfernt.
          <p className="max-w-prose text-body text-muted-foreground">
            {closedExplanation}
          </p>
        )}
      </section>

      <section
        aria-labelledby="massnahmen"
        className="flex max-w-prose flex-col gap-6 border-t border-border pt-6"
      >
        <h2 id="massnahmen" className="text-title">
          Wenn etwas nicht in Ordnung ist
        </h2>

        <div className="flex flex-col gap-3">
          <h3 className="text-subtitle">Melden</h3>
          <p className="text-body text-muted-foreground">
            Wir sehen uns den Briefwechsel an. Der Inhalt bleibt vorerst
            sichtbar.
          </p>
          <ReportConversationButton conversationId={result.data.id} />
        </div>

        {/* Blockieren nur, solange keine Blockierung besteht. Ein
            Selbstblockieren kann hier nicht entstehen, weil partnerId
            zwangslaeufig die andere Person ist. */}
        {result.data.closedReason === null ? (
          <div className="flex flex-col gap-3">
            <h3 className="text-subtitle">Blockieren</h3>
            <p className="text-body text-muted-foreground">
              Ihr könnt einander danach nicht mehr schreiben und bekommt keine
              Briefe mehr voneinander zugeteilt.
            </p>
            <div>
              <BlockPartnerButton
                partnerId={result.data.partnerId}
                partnerAnomailId={partnerLabel}
              />
            </div>
          </div>
        ) : null}

        {result.data.closedReason === "blocked-by-you" ? (
          <p className="text-body text-muted-foreground">
            Du hast diese Person blockiert. Unter{" "}
            <Link
              href="/blocked"
              className="focus-ring rounded-md text-primary underline underline-offset-4"
            >
              Blockierte Personen
            </Link>{" "}
            kannst du das wieder aufheben.
          </p>
        ) : null}

        {result.data.closedReason === null ? (
          <div className="flex flex-col gap-3">
            <h3 className="text-subtitle">Briefwechsel beenden</h3>
            <p className="text-body text-muted-foreground">
              Danach kann niemand mehr hineinschreiben. Der Verlauf bleibt für
              euch beide lesbar.
            </p>
            <div>
              <ArchiveConversationAction conversationId={result.data.id} />
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
