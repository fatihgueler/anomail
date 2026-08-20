"use client";

import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type TextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "id"
> & {
  /** Pflicht: jedes Eingabefeld braucht ein sichtbares Label. */
  label: string;
  /** Obergrenze und Bezugswert des sichtbaren Zaehlers. */
  maxLength: number;
  value: string;
  onValueChange: (value: string) => void;
  /** Erklaerender Text unter dem Label. */
  hint?: string;
  error?: string;
  loading?: boolean;
};

/**
 * Textbereich mit sichtbarem Zeichenzaehler.
 *
 * Der Zaehler ist aria-live="polite", damit Screenreader den Rest mitbekommen,
 * ohne bei jedem Tastendruck zu unterbrechen.
 */
export function Textarea({
  label,
  maxLength,
  value,
  onValueChange,
  hint,
  error,
  loading = false,
  className,
  disabled,
  rows = 8,
  ...props
}: TextareaProps) {
  const fieldId = React.useId();
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const counterId = `${fieldId}-counter`;

  const remaining = maxLength - value.length;
  const isNearLimit = remaining <= Math.max(20, Math.round(maxLength * 0.1));

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-16 w-full" />
        <span className="sr-only" role="status">
          Der Textbereich wird geladen
        </span>
      </div>
    );
  }

  const describedBy =
    [hint ? hintId : null, error ? errorId : null, counterId]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-label text-foreground">
        {label}
      </label>

      {hint ? (
        <p id={hintId} className="text-small text-muted-foreground">
          {hint}
        </p>
      ) : null}

      <textarea
        id={fieldId}
        rows={rows}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          "focus-ring w-full resize-y rounded-lg border bg-card p-4 text-card-foreground",
          /*
           * Serif, nicht die Oberflaechenschrift.
           *
           * Hier steht, was ein Mensch geschrieben hat. In derselben Schrift
           * wie ein Knopf gesetzt, saehe ein Brief aus wie ein Formularfeld.
           * Die Klasse setzt zugleich Zeilenhoehe und Zeilenlaenge - deshalb
           * kein text-body daneben.
           */
          "brieftext max-w-none",
          "placeholder:text-muted-foreground",
          "transition-colors duration-fast",
          error ? "border-destructive" : "border-input hover:border-primary",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
          className,
        )}
        {...props}
      />

      <div className="flex items-start justify-between gap-3">
        {error ? (
          <p id={errorId} role="alert" className="text-small text-destructive">
            {error}
          </p>
        ) : (
          <span />
        )}

        <p
          id={counterId}
          aria-live="polite"
          className={cn(
            "text-label tabular-nums",
            isNearLimit ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {value.length} von {maxLength} Zeichen
        </p>
      </div>
    </div>
  );
}
