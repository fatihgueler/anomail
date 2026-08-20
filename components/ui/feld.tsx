"use client";

import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Eingabefeld mit mitwanderndem Label.
 *
 * Das Label ist ein echtes <label> und bleibt es in jedem Zustand - es wandert
 * nur nach oben, wenn das Feld belegt ist oder den Fokus hat. Die verbreitete
 * Variante, das Label durch ein placeholder-Attribut zu ersetzen, waere
 * bequemer und schlechter: der Platzhalter verschwindet beim Tippen, und wer
 * beim Ausfuellen unterbrochen wird, weiss nicht mehr, was in das Feld gehoert.
 *
 * Die Bewegung ist reine Zierde. Das Label steht in jedem Zustand da, auch
 * ohne JavaScript und ohne Bewegung.
 */
export function Feld({
  label,
  hinweis,
  fehler,
  icon,
  className,
  ...rest
}: {
  label: string;
  hinweis?: string;
  fehler?: string;
  icon?: LucideIcon;
  /** Ergaenzt die Feldklassen, ersetzt sie nicht. */
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "id">) {
  const id = React.useId();
  const hinweisId = `${id}-hinweis`;
  const fehlerId = `${id}-fehler`;

  const [fokussiert, setFokussiert] = React.useState(false);
  const [belegt, setBelegt] = React.useState(
    Boolean(rest.defaultValue ?? rest.value),
  );

  const oben = fokussiert || belegt;

  const beschreibung =
    [hinweis ? hinweisId : null, fehler ? fehlerId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        {icon ? (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-4 top-1/2 -translate-y-2 transition-colors duration-fast ease-out",
              fehler ? "text-destructive" : oben ? "text-primary" : "text-muted-foreground",
              "motion-reduce:transition-none",
            )}
          >
            <Icon icon={icon} />
          </span>
        ) : null}

        <input
          {...rest}
          id={id}
          aria-invalid={fehler ? true : undefined}
          aria-describedby={beschreibung}
          onFocus={(ereignis) => {
            setFokussiert(true);
            rest.onFocus?.(ereignis);
          }}
          onBlur={(ereignis) => {
            setFokussiert(false);
            setBelegt(ereignis.target.value.length > 0);
            rest.onBlur?.(ereignis);
          }}
          onChange={(ereignis) => {
            setBelegt(ereignis.target.value.length > 0);
            rest.onChange?.(ereignis);
          }}
          className={cn(
            "focus-ring peer w-full rounded-lg border bg-card",
            /*
             * Hoeher als ein gewoehnliches Feld (64px statt 52px), weil oben
             * Platz fuer das hochgewanderte Label gebraucht wird. Bei 52px
             * ueberlappten Label und eingegebener Text um zwei Pixel.
             */
            "h-16 px-4 pb-2 pt-8",
            icon && "pl-12",
            "text-body text-card-foreground",
            "transition-colors duration-fast ease-out motion-reduce:transition-none",
            fehler
              ? "border-destructive"
              : "border-input hover:border-primary focus:border-primary",
            "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
            className,
          )}
        />

        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute left-4 origin-left",
            icon && "left-12",
            "transition-all duration-fast ease-out motion-reduce:transition-none",
            oben
              ? "top-2 text-label text-muted-foreground"
              : "top-4 text-body text-muted-foreground",
          )}
        >
          {label}
        </label>
      </div>

      {hinweis ? (
        <p id={hinweisId} className="text-small text-muted-foreground">
          {hinweis}
        </p>
      ) : null}

      {fehler ? (
        <p id={fehlerId} role="alert" className="text-small text-destructive">
          {fehler}
        </p>
      ) : null}
    </div>
  );
}
