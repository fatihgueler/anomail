import type { Metadata } from "next";
import Link from "next/link";
import { FileSearch } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { loadMyReports, type MyReport } from "@/lib/actions/report";
import { requireActiveUser } from "@/lib/auth/guard";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Meine Meldungen",
};

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" });

const TARGET_LABEL: Record<MyReport["targetType"], string> = {
  letter: "Brief",
  message: "Nachricht",
  conversation: "Briefwechsel",
};

export default async function MyReportsPage() {
  const session = await requireActiveUser("/my-reports");
  const result = await loadMyReports(session);

  if (result.status === "failed") {
    return (
      <main id="hauptinhalt" className="mx-auto flex w-full max-w-shell flex-col gap-8 px-4 py-16 sm:px-6">
        <h1 className="text-display">Meine Meldungen</h1>

        <div
          role="alert"
          className="flex max-w-prose flex-col items-start gap-4 rounded-lg border border-destructive bg-card p-6"
        >
          <h2 className="text-subtitle text-card-foreground">
            Deine Meldungen konnten nicht geladen werden
          </h2>
          <p className="text-body text-muted-foreground">{result.message}</p>
          <Link
            href="/my-reports"
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

  return (
    <main id="hauptinhalt" className="mx-auto flex w-full max-w-shell flex-col gap-8 px-4 py-16 sm:px-6">
      <div className="flex max-w-prose flex-col gap-3">
        <h1 className="text-display">Meine Meldungen</h1>
        <p className="text-body text-muted-foreground">
          Hier siehst du, was du gemeldet hast und wie weit die Prüfung ist.
          Sobald eine Entscheidung gefallen ist, steht die Begründung dabei.
        </p>
      </div>

      {result.reports.length === 0 ? (
        <div className="max-w-prose">
          <EmptyState
            icon={FileSearch}
            title="Du hast noch nichts gemeldet."
            description="Wenn dir ein Brief oder eine Nachricht auffällt, kannst du sie dort direkt melden."
            action={
              <Link
                href="/my-letters"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "whitespace-nowrap",
                )}
              >
                Zu meinen Briefen
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="flex max-w-prose flex-col gap-4">
          {result.reports.map((report) => (
            <li key={report.id}>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1 text-label",
                        report.status === "pending"
                          ? "border-input bg-muted text-foreground"
                          : "border-primary bg-secondary text-primary",
                      )}
                    >
                      {report.status === "pending"
                        ? "In Prüfung"
                        : "Abgeschlossen"}
                    </span>

                    <span className="text-label text-muted-foreground">
                      {TARGET_LABEL[report.targetType]} · {report.reasonLabel}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-3">
                  <p className="text-small text-muted-foreground">
                    Gemeldet am {dateFormat.format(report.createdAt)}
                  </p>

                  {/* Die Kennung macht die Meldung nachvollziehbar, wenn sich
                      jemand deswegen an uns wendet. */}
                  <p className="text-small text-muted-foreground">
                    Kennung:{" "}
                    <code className="tabular-nums">
                      {report.id.slice(0, 8).toUpperCase()}
                    </code>
                  </p>

                  {report.status === "resolved" ? (
                    <div className="flex flex-col gap-1">
                      <h2 className="text-label text-foreground">Begründung</h2>
                      <p className="text-body text-card-foreground">
                        {report.resolutionNote ??
                          "Es wurde keine Begründung hinterlegt."}
                      </p>
                      {report.resolvedAt ? (
                        <p className="text-small text-muted-foreground">
                          Entschieden am {dateFormat.format(report.resolvedAt)}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-body text-muted-foreground">
                      Wir sehen uns die Meldung an. Der gemeldete Inhalt bleibt
                      vorerst sichtbar.
                    </p>
                  )}
                </CardContent>

                {report.conversationId ? (
                  <CardFooter>
                    <Link
                      href={`/conversation/${report.conversationId}`}
                      className={cn(
                        buttonVariants({ variant: "secondary" }),
                        "whitespace-nowrap",
                      )}
                    >
                      Gespräch öffnen
                    </Link>
                  </CardFooter>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
