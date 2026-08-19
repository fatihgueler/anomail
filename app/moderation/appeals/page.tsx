import { Scale } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { loadAppealQueue } from "@/lib/actions/moderation/queue";
import { requireModerator } from "@/lib/auth/guard";
import { cn } from "@/lib/utils";

import { AppealDecisionAction } from "../action-groups";
import { ContentQuote, QueueError } from "../shared";

export const dynamic = "force-dynamic";

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

const TARGET_LABEL = {
  letter: "Brief",
  message: "Nachricht",
  account: "Kontosperre",
} as const;

const STATUS_LABEL = {
  open: "Offen",
  upheld: "Stattgegeben",
  rejected: "Abgelehnt",
} as const;

export default async function ModerationAppealsPage() {
  const session = await requireModerator("/moderation/appeals");
  const result = await loadAppealQueue(session);

  if (result.status === "failed") {
    return (
      <div>
        <h2 className="sr-only">Widersprüche</h2>
        <QueueError
          title="Die Widersprüche konnten nicht geladen werden"
          message={result.message}
          retryHref="/moderation/appeals"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-prose flex-col gap-2">
        <h2 className="text-title">Widersprüche</h2>
        <p className="text-body text-muted-foreground">
          Beschwerden gegen Entscheidungen der Moderation. Der Digital Services
          Act verlangt in Artikel 20, dass jede davon bearbeitet und begründet
          beantwortet wird.
        </p>
      </div>

      {result.appeals.length === 0 ? (
        <div className="max-w-prose">
          <EmptyState
            icon={Scale}
            title="Es liegt kein Widerspruch vor."
            description="Sobald jemand einer Entscheidung widerspricht, erscheint der Vorgang hier."
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-6">
          {result.appeals.map((appeal) => (
            <li
              key={appeal.id}
              className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-card"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-label",
                    appeal.status === "open"
                      ? "border-input bg-muted text-foreground"
                      : "border-primary bg-secondary text-primary",
                  )}
                >
                  {STATUS_LABEL[appeal.status]}
                </span>

                <span className="text-label text-muted-foreground">
                  {TARGET_LABEL[appeal.targetType]}
                </span>

                <time className="text-label text-muted-foreground">
                  {dateTimeFormat.format(appeal.createdAt)}
                </time>
              </div>

              <div>
                <h3 className="text-label text-muted-foreground">
                  Widerspruch von
                </h3>
                <p className="text-body tabular-nums">
                  {appeal.appellantAnomailId ?? "Unbekannt"}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-label text-muted-foreground">Begründung</h3>
                <ContentQuote>{appeal.message}</ContentQuote>
              </div>

              {appeal.decisionNote ? (
                <div className="flex flex-col gap-1">
                  <h3 className="text-label text-muted-foreground">
                    Unsere Entscheidung
                  </h3>
                  <p className="max-w-prose text-body">{appeal.decisionNote}</p>
                </div>
              ) : null}

              {appeal.status === "open" ? (
                <div className="flex flex-wrap items-start gap-4 border-t border-border pt-4">
                  <AppealDecisionAction appealId={appeal.id} decision="upheld" />
                  <AppealDecisionAction appealId={appeal.id} decision="rejected" />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
