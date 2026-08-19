"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type CopyFieldProps = {
  /** Pflicht: auch ein Nur-Lese-Feld braucht ein Label. */
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
};

type CopyState = "bereit" | "kopiert" | "fehlgeschlagen";

const STATE_MESSAGE: Record<CopyState, string> = {
  bereit: "",
  kopiert: "In die Zwischenablage kopiert.",
  fehlgeschlagen:
    "Kopieren hat nicht geklappt. Markiere den Text und kopiere ihn von Hand.",
};

/**
 * Kopierbares Feld, etwa fuer die Anomail-ID.
 * Der Wert bleibt sichtbar und markierbar, damit das Kopieren auch dann
 * gelingt, wenn die Zwischenablage gesperrt ist.
 */
export function CopyField({
  label,
  value,
  hint,
  loading = false,
  disabled = false,
  className,
}: CopyFieldProps) {
  const fieldId = React.useId();
  const hintId = `${fieldId}-hint`;
  const statusId = `${fieldId}-status`;
  const [state, setState] = React.useState<CopyState>("bereit");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState("kopiert");
    } catch (error) {
      console.warn("Anomail: Kopieren nicht möglich.", error);
      setState("fehlgeschlagen");
    }
  };

  if (loading) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-control w-full" />
        <span className="sr-only" role="status">
          Das Feld wird geladen
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={fieldId} className="text-label text-foreground">
        {label}
      </label>

      {hint ? (
        <p id={hintId} className="text-small text-muted-foreground">
          {hint}
        </p>
      ) : null}

      <div className="flex items-stretch gap-2">
        <input
          id={fieldId}
          readOnly
          disabled={disabled}
          value={value}
          aria-describedby={
            [hint ? hintId : null, statusId].filter(Boolean).join(" ")
          }
          className={cn(
            // min-w-0 ist noetig, nicht kosmetisch: ein Flex-Kind hat von sich
            // aus min-width: auto und schrumpft deshalb nie unter die eigene
            // Inhaltsbreite. Auf 320px schob das Feld die Seite waagerecht auf.
            "focus-ring h-control min-w-0 flex-1 rounded-lg border border-input bg-card px-4",
            "text-body tabular-nums text-card-foreground",
            "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
          )}
        />

        <button
          type="button"
          onClick={copy}
          disabled={disabled}
          className={cn(
            "focus-ring hit-area h-control inline-flex shrink-0 items-center gap-2 rounded-lg px-4",
            "border-control border-primary text-label text-primary",
            "transition-colors duration-fast",
            "hover:bg-secondary hover:text-primary-hover active:bg-muted active:text-primary-active",
            "disabled:cursor-not-allowed disabled:border-input disabled:text-muted-foreground",
          )}
        >
          <Icon icon={state === "kopiert" ? Check : Copy} />
          {state === "kopiert" ? "Kopiert" : "Kopieren"}
        </button>
      </div>

      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={cn(
          "text-small",
          state === "fehlgeschlagen"
            ? "text-destructive"
            : "text-muted-foreground",
        )}
      >
        {STATE_MESSAGE[state]}
      </p>
    </div>
  );
}
