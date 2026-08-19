import Link from "next/link";
import { Inbox } from "lucide-react";

import { REPORT_REASONS } from "@/lib/actions/report-reasons";
import { EmptyState } from "@/components/ui/empty-state";
import { PAGE_SIZE, loadReportQueue } from "@/lib/actions/moderation/queue";
import { requireModerator } from "@/lib/auth/guard";
import { cn } from "@/lib/utils";

import {
  BanAction,
  HideAction,
  ResolveReportAction,
} from "../action-groups";
import { ContentQuote, Pagination, QueueError, parsePage } from "../shared";

export const dynamic = "force-dynamic";

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

const REASON_LABEL = new Map<string, string>(
  REPORT_REASONS.map((entry) => [entry.value, entry.label]),
);

const TARGET_LABEL = {
  letter: "Brief",
  message: "Nachricht",
  conversation: "Briefwechsel",
} as const;

type PageProps = {
  searchParams: Promise<{ seite?: string; status?: string; grund?: string }>;
};

export default async function ModerationReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireModerator("/moderation/reports");

  const page = parsePage(params.seite);
  const status =
    params.status === "resolved" || params.status === "all"
      ? params.status
      : "pending";
  const reason = REASON_LABEL.has(params.grund ?? "") ? params.grund : undefined;

  const result = await loadReportQueue(session, { page, status, reason });

  if (result.status === "failed") {
    return (
      <div>
        <h2 className="sr-only">Meldungen</h2>
        <QueueError
          title="Die Meldungen konnten nicht geladen werden"
          message={result.message}
          retryHref="/moderation/reports"
        />
      </div>
    );
  }

  const filterHref = (next: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const merged = { status, grund: reason, ...next };

    for (const [key, value] of Object.entries(merged)) {
      if (value && value !== "pending") {
        query.set(key, value);
      }
    }

    const suffix = query.toString();
    return suffix ? `/moderation/reports?${suffix}` : "/moderation/reports";
  };

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-title">Meldungen</h2>

      <nav aria-label="Filter" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-label text-muted-foreground">Status</span>
          {(
            [
              ["pending", "Offen"],
              ["resolved", "Abgeschlossen"],
              ["all", "Alle"],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={filterHref({ status: value, seite: undefined })}
              aria-current={status === value ? "true" : undefined}
              className={cn(
                "focus-ring hit-area inline-flex items-center rounded-full border px-4 text-label",
                "whitespace-nowrap transition-colors duration-fast",
                status === value
                  ? "border-primary bg-secondary text-primary"
                  : "border-input bg-card text-card-foreground hover:bg-secondary",
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-label text-muted-foreground">Grund</span>
          <Link
            href={filterHref({ grund: undefined, seite: undefined })}
            aria-current={!reason ? "true" : undefined}
            className={cn(
              "focus-ring hit-area inline-flex items-center rounded-full border px-4 text-label",
              "whitespace-nowrap transition-colors duration-fast",
              !reason
                ? "border-primary bg-secondary text-primary"
                : "border-input bg-card text-card-foreground hover:bg-secondary",
            )}
          >
            Alle
          </Link>

          {REPORT_REASONS.map((entry) => (
            <Link
              key={entry.value}
              href={filterHref({ grund: entry.value, seite: undefined })}
              aria-current={reason === entry.value ? "true" : undefined}
              className={cn(
                "focus-ring hit-area inline-flex items-center rounded-full border px-4 text-label",
                "whitespace-nowrap transition-colors duration-fast",
                reason === entry.value
                  ? "border-primary bg-secondary text-primary"
                  : "border-input bg-card text-card-foreground hover:bg-secondary",
              )}
            >
              {entry.label}
            </Link>
          ))}
        </div>
      </nav>

      {result.reports.length === 0 ? (
        <div className="max-w-prose">
          <EmptyState
            icon={Inbox}
            title="Hier ist gerade nichts zu tun."
            description="In diesem Filter liegt keine Meldung. Wechsel den Status oder den Grund, um andere Vorgänge zu sehen."
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-6">
          {result.reports.map((report) => (
            <li
              key={report.id}
              className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-card"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-label",
                    report.status === "pending"
                      ? "border-input bg-muted text-foreground"
                      : "border-primary bg-secondary text-primary",
                  )}
                >
                  {report.status === "pending" ? "Offen" : "Abgeschlossen"}
                </span>

                <span className="text-label text-muted-foreground">
                  {REASON_LABEL.get(report.reason) ?? report.reason} ·{" "}
                  {TARGET_LABEL[report.targetType]}
                </span>

                {report.reportCount > 1 ? (
                  <span className="inline-flex items-center rounded-full border-2 border-destructive bg-muted px-3 py-1 text-label text-destructive">
                    {report.reportCount} Meldungen zu diesem Inhalt
                  </span>
                ) : null}

                <time className="text-label text-muted-foreground">
                  {dateTimeFormat.format(report.createdAt)}
                </time>
              </div>

              <dl className="flex flex-wrap gap-6">
                <div>
                  <dt className="text-label text-muted-foreground">Gemeldet von</dt>
                  <dd className="text-body tabular-nums">
                    {report.reporterAnomailId ?? "Unbekannt"}
                  </dd>
                </div>
                <div>
                  <dt className="text-label text-muted-foreground">Verfasst von</dt>
                  <dd className="text-body tabular-nums">
                    {report.targetAuthorAnomailId ?? "Unbekannt"}
                  </dd>
                </div>
              </dl>

              {report.targetType === "message" && report.context.length > 1 ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-label text-muted-foreground">
                    Gemeldete Nachricht im Zusammenhang
                  </h3>
                  <ol className="flex flex-col gap-2">
                    {report.context.map((entry) => (
                      <li
                        key={entry.id}
                        className={cn(
                          "rounded-lg border p-3",
                          entry.isTarget
                            ? "border-2 border-destructive bg-muted"
                            : "border-border bg-card",
                        )}
                      >
                        <p className="text-label text-muted-foreground">
                          {entry.authorAnomailId ?? "Unbekannt"} ·{" "}
                          {dateTimeFormat.format(entry.createdAt)}
                          {entry.isTarget ? " · gemeldet" : ""}
                        </p>
                        <p className="mt-1 max-w-prose whitespace-pre-wrap text-body">
                          {entry.content}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <h3 className="text-label text-muted-foreground">
                    Gemeldeter Inhalt
                  </h3>
                  <ContentQuote>
                    {report.targetContent ?? "Der Inhalt ist nicht mehr verfügbar."}
                  </ContentQuote>
                </div>
              )}

              {report.resolutionNote ? (
                <div className="flex flex-col gap-1">
                  <h3 className="text-label text-muted-foreground">Begründung</h3>
                  <p className="max-w-prose text-body">{report.resolutionNote}</p>
                </div>
              ) : null}

              {report.status === "pending" ? (
                <div className="flex flex-wrap items-start gap-4 border-t border-border pt-4">
                  <ResolveReportAction reportId={report.id} />
                  <HideAction
                    targetType={report.targetType}
                    targetId={report.targetId}
                  />
                  {report.targetAuthorId ? (
                    <BanAction
                      userId={report.targetAuthorId}
                      anomailId={report.targetAuthorAnomailId ?? "dieses Konto"}
                    />
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Pagination
        basePath="/moderation/reports"
        page={page}
        total={result.total}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
