"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type CategoryChipProps = {
  label: string;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
};

/**
 * Ein einzelner Chip fuer die Mehrfachauswahl.
 * aria-pressed statt Checkbox-Optik, weil der Chip als Schalter auftritt.
 */
export function CategoryChip({
  label,
  selected,
  onSelectedChange,
  disabled = false,
  loading = false,
}: CategoryChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      onClick={() => onSelectedChange(!selected)}
      className={cn(
        "focus-ring hit-area inline-flex items-center gap-2 rounded-full px-4 text-label",
        "border transition-colors duration-fast",
        selected
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active"
          : "border-input bg-card text-card-foreground hover:bg-secondary active:bg-muted",
        "disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground",
      )}
    >
      {selected ? <Icon icon={Check} /> : null}
      {label}
    </button>
  );
}

type CategoryChipGroupProps = {
  /** Sichtbare Ueberschrift der Gruppe. */
  legend: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
};

export function CategoryChipGroup({
  legend,
  options,
  selected,
  onSelectedChange,
  hint,
  error,
  disabled = false,
}: CategoryChipGroupProps) {
  const groupId = React.useId();
  const hintId = `${groupId}-hint`;
  const errorId = `${groupId}-error`;

  const toggle = (value: string, next: boolean) => {
    onSelectedChange(
      next ? [...selected, value] : selected.filter((item) => item !== value),
    );
  };

  return (
    <fieldset
      aria-describedby={
        [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
        undefined
      }
    >
      <legend className="text-label text-foreground">{legend}</legend>

      {hint ? (
        <p id={hintId} className="mt-2 text-small text-muted-foreground">
          {hint}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <CategoryChip
            key={option.value}
            label={option.label}
            selected={selected.includes(option.value)}
            onSelectedChange={(next) => toggle(option.value, next)}
            disabled={disabled}
          />
        ))}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-small text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
