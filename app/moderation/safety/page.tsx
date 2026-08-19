import { ShieldCheck } from "lucide-react";

import { RiskBadge } from "@/components/moderation/risk-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { PAGE_SIZE, loadSafetyQueue } from "@/lib/actions/moderation/queue";
import { requireModerator } from "@/lib/auth/guard";
import { cn } from "@/lib/utils";

import { BanAction, HideAction, SafetyCheckAction } from "../action-groups";
import { ContentQuote, Pagination, QueueError, parsePage } from "../shared";

export const dynamic = "force-dynamic";

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

const STATUS_LABEL = {
  open: "Offen",
  reviewing: "In Bearbeitung",
  resolved: "Erledigt",
  dismissed: "Falsch positiv",
} as const;

function waiting(minutes: number): string {
  if (minutes < 60) return `${minutes} Minuten`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} Stunden`;
  return `${Math.floor(hours / 24)} Tage`;
}

type PageProps = { searchParams: Promise<{ seite?: string }> };

export default async function ModerationSafetyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireModerator("/moderation/safety");
  const page = parsePage(params.seite);

  const result = await loadSafetyQueue(session, page);

  if (result.status === "failed") {
    return (
      <div>
        <h2 className="sr-only">Sicherheitsprüfungen</h2>
        <QueueError
          title="Die Sicherheitsprüfungen konnten nicht geladen werden"
          message={result.message}
          retryHref="/moderation/safety"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-prose flex-col gap-2">
        <h2 className="text-title">Sicherheitsprüfungen</h2>
        <p className="text-body text-muted-foreground">
          Sortiert nach Dringlichkeit. Krisenfälle stehen immer oben, unabhängig
          vom Alter des Eintrags.
        </p>
      </div>

      {result.items.length === 0 ? (
        <div className="max-w-prose">
          <EmptyState
            icon={ShieldCheck}
            title="Keine Sicherheitsprüfung wartet auf eine Entscheidung."
            description="Sobald ein Beitrag geprüft wurde, erscheint das Ergebnis hier."
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-6">
          {result.items.map((entry) => (
            <li
              key={entry.id}
              className={cn(
                "flex flex-col gap-4 rounded-lg bg-card p-6 shadow-card",
                entry.riskLevel === "CRISIS"
                  ? "border-2 border-destructive"
                  : "border border-border",
              )}
            >
              <div className="flex flex-wrap items-center gap-3">
                <RiskBadge level={entry.riskLevel} />

                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-label",
                    entry.moderationStatus === "open"
                      ? "border-input bg-muted text-foreground"
                      : "border-primary bg-secondary text-primary",
                  )}
                >
                  {STATUS_LABEL[entry.moderationStatus]}
                </span>

                {entry.shouldHold ? (
                  <span className="inline-flex items-center rounded-full border border-destructive bg-muted px-3 py-1 text-label text-destructive">
                    Zurückgehalten
                  </span>
                ) : null}

                <time className="text-label text-muted-foreground">
                  {dateTimeFormat.format(entry.createdAt)} · wartet seit{" "}
                  {waiting(entry.waitingMinutes)}
                </time>
              </div>

              {entry.riskLevel === "CRISIS" ? (
                <NoticeBanner
                  tone="warnung"
                  title="Anomail ist kein Krisendienst"
                >
                  <p>
                    Die Moderation leistet keine Krisenintervention. Deine
                    Handlungsmöglichkeit besteht in der Entscheidung über den
                    Inhalt und im Verweis auf die Hilfsangebote, die der Person
                    beim Absenden angezeigt wurden. Eine Kontaktaufnahme ist
                    weder vorgesehen noch zulässig.
                  </p>
                </NoticeBanner>
              ) : null}

              <dl className="flex flex-wrap gap-6">
                <div>
                  <dt className="text-label text-muted-foreground">Verfasst von</dt>
                  <dd className="text-body tabular-nums">
                    {entry.senderAnomailId ?? "Unbekannt"}
                  </dd>
                </div>
                <div>
                  <dt className="text-label text-muted-foreground">Art</dt>
                  <dd className="text-body">
                    {entry.targetType === "letter" ? "Brief" : "Nachricht"}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-col gap-2">
                <h3 className="text-label text-muted-foreground">
                  Geprüfter Text
                </h3>
                <ContentQuote>{entry.contentSnapshot}</ContentQuote>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-label text-muted-foreground">Einschätzung</h3>
                <p className="max-w-prose text-body">{entry.reasoning}</p>
              </div>

              {entry.detectedCategories.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-label text-muted-foreground">
                    Erkannte Signale
                  </h3>
                  <ul className="flex flex-wrap gap-2">
                    {entry.detectedCategories.map((category) => (
                      <li
                        key={category}
                        className="rounded-full border border-input bg-secondary px-3 py-1 text-label text-secondary-foreground"
                      >
                        {category}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap items-start gap-4 border-t border-border pt-4">
                <SafetyCheckAction
                  checkId={entry.id}
                  status="resolved"
                  label="Erledigt"
                  title="Prüfung als erledigt eintragen?"
                  description="Der Vorgang verschwindet aus der offenen Liste. Am Inhalt selbst ändert das nichts."
                />
                <SafetyCheckAction
                  checkId={entry.id}
                  status="dismissed"
                  label="Falsch positiv"
                  title="Als falsch positiv eintragen?"
                  description="Die Einstufung war unzutreffend. Halte fest, woran du das festmachst — daran wird die Prüfung nachjustiert."
                />

                {entry.targetId ? (
                  <HideAction
                    targetType={entry.targetType === "letter" ? "letter" : "message"}
                    targetId={entry.targetId}
                  />
                ) : null}

                <BanAction
                  userId={entry.senderId}
                  anomailId={entry.senderAnomailId ?? "dieses Konto"}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        basePath="/moderation/safety"
        page={page}
        total={result.total}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
