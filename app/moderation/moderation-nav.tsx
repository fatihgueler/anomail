"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Bereichsnavigation.
 *
 * Bewusst <nav> mit Links und aria-current statt role="tablist".
 *
 * Jeder Tab hat eine eigene Route, damit ein Zustand teil- und
 * wiederherstellbar ist. Damit gehoert das ARIA-Tab-Muster hier nicht hin: es
 * kuendigt Panels im selben Dokument an, die es nicht gibt, und es faengt die
 * Pfeiltasten ab, mit denen sonst gescrollt wird. Links in einer Navigation
 * sind mit der Tabulatortaste erreichbar, mit Eingabe aktivierbar und tragen
 * ueber aria-current, welcher Bereich offen ist - das ist das korrekte Muster
 * fuer routenbasierte Bereiche.
 */

const TABS = [
  { href: "/moderation/reports", label: "Meldungen" },
  { href: "/moderation/letters", label: "Briefe" },
  { href: "/moderation/responses", label: "Antworten" },
  { href: "/moderation/safety", label: "Sicherheitsprüfungen" },
  { href: "/moderation/appeals", label: "Widersprüche" },
] as const;

type ModerationNavProps = {
  isAdmin: boolean;
  crisisOpen: number;
  crisisOldestMinutes: number | null;
};

function waitingLabel(minutes: number | null): string | null {
  if (minutes === null) {
    return null;
  }

  if (minutes < 60) {
    return `${minutes} Minuten`;
  }

  const hours = Math.floor(minutes / 60);
  return hours < 24
    ? `${hours} Stunden`
    : `${Math.floor(hours / 24)} Tage`;
}

export function ModerationNav({
  isAdmin,
  crisisOpen,
  crisisOldestMinutes,
}: ModerationNavProps) {
  const pathname = usePathname();
  const waiting = waitingLabel(crisisOldestMinutes);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-display">Moderation</h1>

        {/* Zaehler offener CRISIS-Faelle, in jedem Bereich sichtbar. */}
        {crisisOpen > 0 ? (
          <p
            role="status"
            className="inline-flex items-center gap-2 rounded-full border-2 border-destructive bg-muted px-3 py-1 text-label text-destructive"
          >
            <Icon icon={AlertTriangle} />
            {crisisOpen} offene{crisisOpen === 1 ? "r" : ""} Krisenfall
            {crisisOpen === 1 ? "" : "e"}
            {waiting ? ` · ältester seit ${waiting}` : ""}
          </p>
        ) : (
          <p className="text-label text-muted-foreground">
            Keine offenen Krisenfälle
          </p>
        )}
      </div>

      <nav aria-label="Moderationsbereiche">
        <ul className="flex flex-wrap gap-2 border-b border-border pb-3">
          {TABS.map((tab) => {
            const isCurrent = pathname.startsWith(tab.href);

            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "focus-ring hit-area inline-flex items-center rounded-lg px-4 text-body",
                    "whitespace-nowrap transition-colors duration-fast",
                    isCurrent
                      ? "bg-secondary font-semibold text-primary"
                      : "text-foreground hover:bg-secondary",
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}

          {isAdmin ? (
            <li>
              <Link
                href="/moderation/audit"
                aria-current={
                  pathname.startsWith("/moderation/audit") ? "page" : undefined
                }
                className={cn(
                  "focus-ring hit-area inline-flex items-center rounded-lg px-4 text-body",
                  "whitespace-nowrap transition-colors duration-fast",
                  pathname.startsWith("/moderation/audit")
                    ? "bg-secondary font-semibold text-primary"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                Prüfprotokoll
              </Link>
            </li>
          ) : null}
        </ul>
      </nav>
    </div>
  );
}
