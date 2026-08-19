"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  description?: string;
  /** Pflicht: ein Fehler ohne Ausweg ist eine Sackgasse. */
  onRetry: () => void;
  retryLabel?: string;
  retrying?: boolean;
  className?: string;
};

export function ErrorState({
  title = "Das hat nicht geklappt",
  description = "Wir konnten die Daten gerade nicht laden. Bitte versuche es noch einmal.",
  onRetry,
  retryLabel = "Erneut versuchen",
  retrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-4 rounded-lg border border-destructive bg-card p-6",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-1 text-destructive">
          <Icon icon={AlertTriangle} />
        </span>

        <div className="flex flex-col gap-2">
          <h3 className="text-subtitle text-card-foreground">{title}</h3>
          <p className="max-w-prose text-body text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <Button
        variant="secondary"
        iconLeft={RotateCcw}
        loading={retrying}
        loadingLabel="Wird erneut versucht"
        onClick={onRetry}
      >
        {retryLabel}
      </Button>
    </div>
  );
}
