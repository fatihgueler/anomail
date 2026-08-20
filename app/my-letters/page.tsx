import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, MessageSquare, PenLine } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { loadMyLetters, type LetterStatus } from "@/lib/actions/conversation";
import { requireActiveUser } from "@/lib/auth/guard";
import type { BriefStatus } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import { LetterCard } from "./letter-card";

export const metadata: Metadata = {
  title: "Meine Briefe",
};

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<LetterStatus, BriefStatus> = {
  waiting: "wartet",
  in_progress: "in-bearbeitung",
  answered: "beantwortet",
  flagged: "zurueckgehalten",
};

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" });

export default async function MyLettersPage() {
  const session = await requireActiveUser("/my-letters");
  const result = await loadMyLetters(session);

  if (result.status === "failed") {
    return (
      <main id="hauptinhalt" className="mx-auto flex w-full max-w-shell flex-col gap-8 px-4 py-16 sm:px-6">
        <h1 className="text-display">Meine Briefe</h1>

        <div
          role="alert"
          className="flex max-w-prose flex-col items-start gap-4 rounded-lg border border-destructive bg-card p-6"
        >
          <h2 className="text-subtitle text-card-foreground">
            Deine Briefe konnten nicht geladen werden
          </h2>
          <p className="text-body text-muted-foreground">{result.message}</p>
          <Link
            href="/my-letters"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "whitespace-nowrap",
            )}
          >
            Erneut versuchen
          </Link>
        </div>
      </main>
    );
  }

  const { letters, replies } = result.data;
  const isEmpty = letters.length === 0 && replies.length === 0;

  return (
    <main id="hauptinhalt" className="mx-auto flex w-full max-w-shell flex-col gap-12 px-4 py-16 sm:px-6">
      <div className="flex max-w-prose flex-col gap-3">
        <h1 className="text-display">Meine Briefe</h1>
        <p className="text-body text-muted-foreground">
          Hier findest du, was du geschrieben hast, und die Briefwechsel, die
          daraus entstanden sind.
        </p>
      </div>

      {isEmpty ? (
        <div className="max-w-prose">
          <EmptyState
            icon={Inbox}
            title="Du hast noch nichts geschrieben."
            description="Sobald du einen Brief schreibst oder auf einen antwortest, erscheint er hier."
            action={
              <Link
                href="/write"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "whitespace-nowrap",
                )}
              >
                <Icon icon={PenLine} />
                Brief schreiben
              </Link>
            }
          />
        </div>
      ) : null}

      {letters.length > 0 ? (
        <section aria-labelledby="eigene-briefe" className="flex flex-col gap-6">
          <h2 id="eigene-briefe" className="text-title">
            Deine Briefe
          </h2>

          <ul className="flex flex-col gap-6">
            {letters.map((letter) => (
              <li key={letter.id}>
                <LetterCard
                  id={letter.id}
                  excerpt={letter.excerpt}
                  createdAtLabel={dateFormat.format(letter.createdAt)}
                  status={STATUS_MAP[letter.status]}
                  isHidden={letter.isHidden}
                  hiddenReason={letter.hiddenReason}
                  isDeleted={letter.isDeleted}
                  categories={letter.categories}
                  conversationId={letter.conversationId}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {replies.length > 0 ? (
        <section aria-labelledby="eigene-antworten" className="flex flex-col gap-6">
          <h2 id="eigene-antworten" className="text-title">
            Deine Antworten
          </h2>

          <ul className="flex flex-col gap-6">
            {replies.map((reply) => (
              <li key={reply.conversationId}>
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-label text-muted-foreground">
                        An {reply.partnerAnomailId ?? "unbekannt"}
                      </span>
                      <time className="text-label text-muted-foreground">
                        {dateFormat.format(reply.createdAt)}
                      </time>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <p className="max-w-prose whitespace-pre-wrap text-body text-card-foreground">
                      {reply.excerpt}
                    </p>

                    {reply.isArchived ? (
                      <p className="mt-3 text-small text-muted-foreground">
                        Dieser Briefwechsel ist beendet.
                      </p>
                    ) : null}
                  </CardContent>

                  <CardFooter>
                    <Link
                      href={`/conversation/${reply.conversationId}`}
                      className={cn(
                        buttonVariants({ variant: "secondary" }),
                        "whitespace-nowrap",
                      )}
                    >
                      <Icon icon={MessageSquare} />
                      Gespräch öffnen
                    </Link>
                  </CardFooter>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
