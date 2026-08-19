import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

/**
 * Bewusst ohne Bewegung. Ein dauerhaft pulsendes Element waere eine
 * Endlos-Animation und damit ausserhalb der Regel, dass Bewegung nur bei
 * Zustandswechseln und hoechstens 200ms lang stattfindet.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-md bg-muted", className)} aria-hidden="true" />
  );
}

type SkeletonTextProps = {
  /** Anzahl der angedeuteten Zeilen. */
  lines?: number;
  className?: string;
  /** Was gerade geladen wird, fuer Screenreader. */
  label?: string;
};

export function SkeletonText({
  lines = 3,
  className,
  label = "Inhalt wird geladen",
}: SkeletonTextProps) {
  return (
    <div
      className={cn("flex flex-col gap-3", className)}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-4", index === lines - 1 ? "w-1/2" : "w-full")}
        />
      ))}
    </div>
  );
}
