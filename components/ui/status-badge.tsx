import { Clock, Eye, MailCheck, PenLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export type BriefStatus =
  | "wartet"
  | "in-bearbeitung"
  | "beantwortet"
  | "zurueckgehalten";

type StatusDefinition = {
  label: string;
  icon: LucideIcon;
  className: string;
};

/**
 * Alle vier Zustaende kommen ohne neue Farb-Tokens aus.
 * Der Status wird zusaetzlich ueber Symbol und Text getragen, nie nur
 * ueber Farbe.
 */
const STATUS: Record<BriefStatus, StatusDefinition> = {
  wartet: {
    label: "Wartet",
    icon: Clock,
    className: "border-input bg-muted text-foreground",
  },
  "in-bearbeitung": {
    label: "In Bearbeitung",
    icon: PenLine,
    className: "border-primary bg-secondary text-primary",
  },
  beantwortet: {
    label: "Beantwortet",
    icon: MailCheck,
    className: "border-accent bg-accent text-accent-foreground",
  },
  zurueckgehalten: {
    label: "Zurückgehalten",
    icon: Eye,
    className: "border-destructive bg-muted text-destructive",
  },
};

type StatusBadgeProps = {
  status: BriefStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const definition = STATUS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-label",
        definition.className,
        className,
      )}
    >
      <Icon icon={definition.icon} />
      {definition.label}
    </span>
  );
}

export const ALL_STATUSES: BriefStatus[] = [
  "wartet",
  "in-bearbeitung",
  "beantwortet",
  "zurueckgehalten",
];
