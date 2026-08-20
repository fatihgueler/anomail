import * as React from "react";

import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Hebt die Karte als anklickbares Ziel hervor. */
  interactive?: boolean;
  /** Ruhiger: ohne Schatten, nur mit Rahmen. Fuer Karten in Listen. */
  flach?: boolean;
};

/**
 * Ein Blatt auf dem Tisch.
 *
 * Kein Farbverlauf, keine Glaseffekte. Der Schatten kommt aus der warmen
 * Papier-Skala und faellt weich - ein Blatt wirft keinen harten Rand.
 */
export function Card({
  className,
  interactive = false,
  flach = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground",
        flach ? "shadow-none" : "shadow-paper-2",
        interactive &&
          cn(
            "transition-[border-color,box-shadow,transform] duration-base ease-out",
            "hover:-translate-y-px hover:border-input hover:shadow-paper-3",
            "focus-within:border-input focus-within:shadow-paper-3",
            "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
          ),
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2 p-6", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-title", className)} {...props} />;
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-small text-muted-foreground", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-t border-border px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}
