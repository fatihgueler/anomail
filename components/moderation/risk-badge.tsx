import { AlertTriangle, CircleAlert, Info, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export type RiskLevel = "GREEN" | "YELLOW" | "RED" | "CRISIS";

/**
 * Risikostufe mit zweiter, nicht-farblicher Kennzeichnung.
 *
 * Farbe allein traegt die Einstufung nicht: jede Stufe hat ein eigenes Symbol,
 * eine eigene Beschriftung und eine eigene Rahmenstaerke. Im Graustufentest
 * bleiben alle vier unterscheidbar - und das ist die Ansicht, in der eine
 * Fehleinschaetzung am teuersten ist.
 */
const RISK: Record<
  RiskLevel,
  { label: string; icon: LucideIcon; surface: string; ring: string }
> = {
  CRISIS: {
    label: "Krise",
    icon: AlertTriangle,
    surface: "bg-destructive text-destructive-foreground",
    ring: "border-2 border-destructive",
  },
  RED: {
    label: "Hoch",
    icon: CircleAlert,
    surface: "bg-muted text-destructive",
    ring: "border-2 border-destructive",
  },
  YELLOW: {
    label: "Mittel",
    icon: Info,
    surface: "bg-secondary text-secondary-foreground",
    ring: "border border-input",
  },
  GREEN: {
    label: "Unauffällig",
    icon: ShieldCheck,
    surface: "bg-card text-card-foreground",
    ring: "border border-border",
  },
};

export function RiskBadge({
  level,
  className,
}: {
  level: RiskLevel;
  className?: string;
}) {
  const risk = RISK[level];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-label",
        risk.surface,
        risk.ring,
        className,
      )}
    >
      <Icon icon={risk.icon} />
      {/* Stufe und Klartext nebeneinander: die Kennung allein waere fuer
          jemanden ohne Vorwissen nicht lesbar. */}
      <span className="tabular-nums">{level}</span>
      <span aria-hidden="true">·</span>
      <span>{risk.label}</span>
    </span>
  );
}

export function riskLabel(level: RiskLevel): string {
  return RISK[level].label;
}
