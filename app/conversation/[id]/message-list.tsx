"use client";

import * as React from "react";

import {
  DeleteMessageItem,
  MessageMenu,
} from "@/components/conversation/message-menu";
import { AppealForm } from "@/components/appeal/appeal-form";
import { ReportMenuItem } from "@/components/report/report-action";
import { ChatBubble } from "@/components/ui/chat-bubble";
import { reportAction } from "@/lib/actions/moderation-actions";
import { REPORT_REASONS } from "@/lib/actions/report-reasons";
import { cn } from "@/lib/utils";

import { deleteMessageAction } from "./actions";

/**
 * Der Verlauf.
 *
 * Jede Blase traegt eine Absenderkennzeichnung im Text. Ausrichtung und Flaeche
 * kommen dazu, tragen die Zuordnung aber nicht allein - im Graustufen- und
 * Unschaerfetest bleibt die Beschriftung lesbar.
 */

export type DisplayMessage = {
  id: string;
  content: string;
  isOriginal: boolean;
  isOwn: boolean;
  isDeleted: boolean;
  isHeld: boolean;
  /** Begruendung der Moderation. Nur beim Absender gesetzt. */
  hiddenReason: string | null;
  createdAtIso: string;
  timeLabel: string;
  dayLabel: string;
};

type MessageListProps = {
  conversationId: string;
  messages: DisplayMessage[];
  ownLabel: string;
  partnerLabel: string;
};

export function MessageList({
  conversationId,
  messages,
  ownLabel,
  partnerLabel,
}: MessageListProps) {
  const [error, setError] = React.useState<string | undefined>();
  const [, startTransition] = React.useTransition();

  let lastDay = "";

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p role="alert" className="text-small text-destructive">
          {error}
        </p>
      ) : null}

      <ol className="flex flex-col gap-6">
        {messages.map((message) => {
          const showDay = message.dayLabel !== lastDay;
          lastDay = message.dayLabel;

          const author = message.isOwn ? ownLabel : partnerLabel;
          const variant = message.isDeleted
            ? "geloescht"
            : message.isOriginal
              ? "original"
              : message.isOwn
                ? "eigen"
                : "fremd";

          // Bei der geloeschten und der eigenen Variante druckt die Blase den
          // Zusatz nicht selbst - deshalb wandert er in die Beschriftung.
          const authorLabel =
            message.isOriginal && variant !== "original"
              ? `${author} · Ursprünglicher Brief`
              : author;

          return (
            <li key={message.id} className="flex flex-col gap-2">
              {showDay ? (
                <p className="text-center text-label text-muted-foreground">
                  {message.dayLabel}
                </p>
              ) : null}

              <div
                className={cn(
                  "flex items-start gap-2",
                  message.isOwn && "flex-row-reverse",
                )}
              >
                <div className="min-w-0 flex-1">
                  <ChatBubble
                    variant={variant}
                    author={authorLabel}
                    timestamp={message.timeLabel}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </ChatBubble>

                  {message.isHeld ? (
                    <div className="mt-2 flex max-w-prose flex-col gap-3">
                      <p className="text-small text-muted-foreground">
                        Diese Nachricht wird gerade geprüft. Sie ist für die
                        andere Person noch nicht sichtbar.
                      </p>

                      {/* Begruendung der Moderation nach DSA Art. 17. */}
                      {message.hiddenReason ? (
                        <p className="text-small text-foreground">
                          <span className="font-semibold">Begründung: </span>
                          {message.hiddenReason}
                        </p>
                      ) : null}

                      {/* Beschwerdeweg nach DSA Art. 20. */}
                      {message.isOwn ? (
                        <AppealForm targetType="message" targetId={message.id} />
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/*
                  Loeschen nur an eigenen Nachrichten, Melden nur an fremden.
                  Die eigene Nachricht ist nicht meldbar - der Eintrag wird gar
                  nicht gerendert, und die Serveraktion weist sie zusaetzlich ab.
                */}
                {!message.isDeleted ? (
                  <MessageMenu
                    label={`Aktionen zur Nachricht von ${message.timeLabel}`}
                  >
                    {message.isOwn ? (
                      <DeleteMessageItem
                        onConfirm={() => {
                          setError(undefined);
                          startTransition(async () => {
                            const failure = await deleteMessageAction(
                              conversationId,
                              message.id,
                            );

                            if (failure) {
                              setError(failure);
                            }
                          });
                        }}
                      />
                    ) : (
                      <ReportMenuItem
                        reasons={REPORT_REASONS}
                        subject="Nachricht"
                        onReport={(reason, note) =>
                          reportAction("message", message.id, reason, note)
                        }
                      />
                    )}
                  </MessageMenu>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
