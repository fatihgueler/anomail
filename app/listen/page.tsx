import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, PenLine } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { assignLetterForUser, LEASE_MINUTES } from "@/lib/actions/listen";
import { requireActiveUser } from "@/lib/auth/guard";
import { cn } from "@/lib/utils";

import { ReplyForm } from "./reply-form";
import { ReportLetterButton } from "./report-letter";

export const metadata: Metadata = {
  title: "Zuhören",
};

/** Die Zuweisung ist ein Seiteneffekt und darf nicht zwischengespeichert werden. */
export const dynamic = "force-dynamic";

export default async function ListenPage() {
  const session = await requireActiveUser("/listen");

  // Die Zuweisung passiert hier, serverseitig, ueber assign_letter().
  // Kein Laden, Filtern und Aktualisieren in der Anwendungsschicht.
  const result = await assignLetterForUser(session);

  return (
    <main id="hauptinhalt" className="mx-auto flex w-full max-w-shell flex-col gap-8 px-4 py-16 sm:px-6">
      <div className="flex max-w-prose flex-col gap-3">
        <h1 className="text-display">Zuhören</h1>
        <p className="text-body text-muted-foreground">
          Hier bekommst du genau einen Brief. Lies ihn in Ruhe und antworte, wenn
          du etwas zu sagen hast.
        </p>
      </div>

      {result.status === "failed" ? (
        <div
          role="alert"
          className="flex max-w-prose flex-col items-start gap-4 rounded-lg border border-destructive bg-card p-6"
        >
          <div className="flex flex-col gap-2">
            <h2 className="text-subtitle text-card-foreground">
              Der Brief konnte nicht geladen werden
            </h2>
            <p className="text-body text-muted-foreground">{result.message}</p>
          </div>

          <Link
            href="/listen"
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            Erneut versuchen
          </Link>
        </div>
      ) : null}

      {result.status === "empty" ? (
        <div className="max-w-prose">
          <EmptyState
            icon={Inbox}
            title="Gerade wartet kein Brief auf eine Antwort."
            description="Alle eingegangenen Briefe sind gerade in Bearbeitung oder schon beantwortet. Schau später noch einmal vorbei, oder schreib selbst einen Brief."
            action={
              <Link
                href="/write"
                className={cn(buttonVariants({ variant: "secondary" }))}
              >
                <Icon icon={PenLine} />
                Selbst einen Brief schreiben
              </Link>
            }
          />
        </div>
      ) : null}

      {result.status === "assigned" ? (
        <>
          <Card className="max-w-prose">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-label text-muted-foreground">
                  Von {result.letter.authorAnomailId}
                </span>
                <span aria-hidden="true" className="text-muted-foreground">
                  ·
                </span>
                <time
                  dateTime={result.letter.createdAt.toISOString()}
                  className="text-label text-muted-foreground"
                >
                  {new Intl.DateTimeFormat("de-DE", {
                    dateStyle: "long",
                  }).format(result.letter.createdAt)}
                </time>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
              {/* Brieftext in Body-Stufe, Zeilenlänge über max-w-prose begrenzt. */}
              <div className="max-w-prose whitespace-pre-wrap text-body text-card-foreground">
                {result.letter.content}
              </div>

              {result.letter.categories.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h2 className="text-label text-muted-foreground">
                    Eingeordnet unter
                  </h2>
                  {/* Nicht interaktiv: hier gibt es nichts auszuwählen. */}
                  <ul className="flex flex-wrap gap-2">
                    {result.letter.categories.map((category) => (
                      <li
                        key={category.slug}
                        className="rounded-full border border-input bg-secondary px-3 py-1 text-label text-secondary-foreground"
                      >
                        {category.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/*
            Ruhiger Hinweis statt tickendem Countdown. Ein laufender Zähler
            erzeugt Druck an einer Stelle, an der jemand sorgfältig antworten
            soll.
          */}
          <p className="max-w-prose text-small text-muted-foreground">
            Dieser Brief ist für dich reserviert. Bleibst du länger als{" "}
            {LEASE_MINUTES} Minuten untätig, geben wir ihn wieder frei, damit
            jemand anderes antworten kann.
          </p>

          <ReplyForm letterId={result.letter.id} />

          <div className="max-w-prose border-t border-border pt-6">
            <h2 className="text-subtitle">Stimmt etwas nicht?</h2>
            <p className="mt-2 text-body text-muted-foreground">
              Wir sehen uns den Brief an. Er bleibt vorerst sichtbar.
            </p>
            <div className="mt-3">
              <ReportLetterButton letterId={result.letter.id} />
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
