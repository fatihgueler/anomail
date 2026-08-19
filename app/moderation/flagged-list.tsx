import { FileCheck } from "lucide-react";

import { RiskBadge, type RiskLevel } from "@/components/moderation/risk-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { FlaggedItem } from "@/lib/actions/moderation/queue";
import { cn } from "@/lib/utils";

import { BanAction, HideAction, UnhideAction } from "./action-groups";
import { ContentQuote } from "./shared";

/**
 * Gemeinsame Darstellung fuer zurueckgehaltene Briefe und Antworten.
 * Beide Bereiche zeigen dieselben Felder und dieselben Aktionen.
 */

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function isRiskLevel(value: string | null): value is RiskLevel {
  return value === "GREEN" || value === "YELLOW" || value === "RED" || value === "CRISIS";
}

export function FlaggedList({
  items,
  targetType,
  emptyTitle,
  emptyDescription,
}: {
  items: FlaggedItem[];
  targetType: "letter" | "message";
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (items.length === 0) {
    return (
      <div className="max-w-prose">
        <EmptyState
          icon={FileCheck}
          title={emptyTitle}
          description={emptyDescription}
        />
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-6">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-card"
        >
          <div className="flex flex-wrap items-center gap-3">
            {item.status ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-label",
                  item.status === "flagged"
                    ? "border-destructive bg-muted text-destructive"
                    : "border-input bg-muted text-foreground",
                )}
              >
                {item.status === "flagged" ? "Zurückgehalten" : item.status}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-destructive bg-muted px-3 py-1 text-label text-destructive">
                Ausgeblendet
              </span>
            )}

            {isRiskLevel(item.safetyRiskLevel) ? (
              <RiskBadge level={item.safetyRiskLevel} />
            ) : null}

            <time className="text-label text-muted-foreground">
              {dateTimeFormat.format(item.createdAt)}
            </time>
          </div>

          <dl className="flex flex-wrap gap-6">
            <div>
              <dt className="text-label text-muted-foreground">Verfasst von</dt>
              <dd className="text-body tabular-nums">
                {item.authorAnomailId ?? "Unbekannt"}
              </dd>
            </div>
            {item.hiddenAt ? (
              <div>
                <dt className="text-label text-muted-foreground">
                  Ausgeblendet seit
                </dt>
                <dd className="text-body">
                  {dateTimeFormat.format(item.hiddenAt)}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="flex flex-col gap-2">
            <h3 className="text-label text-muted-foreground">Inhalt</h3>
            <ContentQuote>{item.content}</ContentQuote>
          </div>

          {item.hiddenReason ? (
            <div className="flex flex-col gap-1">
              <h3 className="text-label text-muted-foreground">
                Auslösender Grund
              </h3>
              <p className="max-w-prose text-body">{item.hiddenReason}</p>
            </div>
          ) : null}

          {item.safetyReasoning ? (
            <div className="flex flex-col gap-1">
              <h3 className="text-label text-muted-foreground">
                Einschätzung der Sicherheitsprüfung
              </h3>
              <p className="max-w-prose text-body text-muted-foreground">
                {item.safetyReasoning}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-start gap-4 border-t border-border pt-4">
            {item.hiddenAt ? (
              <UnhideAction targetType={targetType} targetId={item.id} />
            ) : (
              <HideAction targetType={targetType} targetId={item.id} />
            )}

            <BanAction
              userId={item.authorId}
              anomailId={item.authorAnomailId ?? "dieses Konto"}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
