"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ToggleSwitchProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
};

/**
 * Umschalter fuer Einstellungen, etwa Benachrichtigungen.
 * Die Trefferflaeche umfasst Label und Schalter, damit sie sicher ueber
 * 44px liegt.
 */
export function ToggleSwitch({
  label,
  checked,
  onCheckedChange,
  description,
  disabled = false,
  loading = false,
  error,
}: ToggleSwitchProps) {
  const switchId = React.useId();
  const descriptionId = `${switchId}-description`;
  const errorId = `${switchId}-error`;

  if (loading) {
    return (
      <div className="flex items-center justify-between gap-4 py-3">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-touch w-16 rounded-full" />
        <span className="sr-only" role="status">
          Die Einstellung wird geladen
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-4">
        <label
          htmlFor={switchId}
          className={cn(
            "hit-area flex flex-1 cursor-pointer flex-col justify-center py-2",
            disabled && "cursor-not-allowed",
          )}
        >
          <span className="text-body text-foreground">{label}</span>
          {description ? (
            <span id={descriptionId} className="text-small text-muted-foreground">
              {description}
            </span>
          ) : null}
        </label>

        <SwitchPrimitive.Root
          id={switchId}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-describedby={
            [description ? descriptionId : null, error ? errorId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={cn(
            "focus-ring relative inline-flex h-8 w-16 shrink-0 items-center rounded-full",
            // Die sichtbare Schiene bleibt schlank, die Trefferflaeche waechst
            // unsichtbar auf 48x80px.
            "before:absolute before:-inset-2 before:content-['']",
            "border transition-colors duration-fast",
            "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
            "data-[state=unchecked]:border-input data-[state=unchecked]:bg-muted",
            "disabled:cursor-not-allowed disabled:border-border disabled:bg-muted",
          )}
        >
          <SwitchPrimitive.Thumb
            className={cn(
              "block h-6 w-6 rounded-full bg-card transition-transform duration-fast",
              "border border-input",
              "data-[state=unchecked]:translate-x-1 data-[state=checked]:translate-x-8",
              "motion-reduce:transition-none",
            )}
          />
        </SwitchPrimitive.Root>
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-small text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
