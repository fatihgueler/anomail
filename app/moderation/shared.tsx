import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Bausteine, die alle Bereiche des Moderationsbereichs teilen. */

export function QueueError({
  title,
  message,
  retryHref,
}: {
  title: string;
  message: string;
  retryHref: string;
}) {
  return (
    <div
      role="alert"
      className="flex max-w-prose flex-col items-start gap-4 rounded-lg border border-destructive bg-card p-6"
    >
      <h2 className="text-subtitle text-card-foreground">{title}</h2>
      <p className="text-body text-muted-foreground">{message}</p>
      <Link
        href={retryHref}
        className={cn(buttonVariants({ variant: "secondary" }), "whitespace-nowrap")}
      >
        Erneut versuchen
      </Link>
    </div>
  );
}

export function QueueSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <span className="sr-only">Die Liste wird geladen</span>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6"
        >
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/**
 * Serverseitige Blaetterung.
 * Es gibt keine Ansicht ohne Obergrenze - freies Blaettern durch fremde
 * Inhalte soll gar nicht erst moeglich sein.
 */
export function Pagination({
  basePath,
  page,
  total,
  pageSize,
}: {
  basePath: string;
  page: number;
  total: number;
  pageSize: number;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  if (lastPage <= 1) {
    return null;
  }

  return (
    <nav aria-label="Seiten" className="flex flex-wrap items-center gap-3">
      {page > 1 ? (
        <Link
          href={`${basePath}?seite=${page - 1}`}
          className={cn(buttonVariants({ variant: "secondary" }), "whitespace-nowrap")}
        >
          Zurück
        </Link>
      ) : null}

      <p className="text-small text-muted-foreground">
        Seite {page} von {lastPage} · {total} Einträge
      </p>

      {page < lastPage ? (
        <Link
          href={`${basePath}?seite=${page + 1}`}
          className={cn(buttonVariants({ variant: "secondary" }), "whitespace-nowrap")}
        >
          Weiter
        </Link>
      ) : null}
    </nav>
  );
}

/** Fremder Inhalt im Klartext, sichtbar abgegrenzt. */
export function ContentQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="max-w-prose whitespace-pre-wrap border-l-accentbar border-l-accent bg-secondary p-4 text-body text-secondary-foreground">
      {children}
    </blockquote>
  );
}

export function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}
