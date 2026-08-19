"use client";

import { AlertTriangle, Info, LifeBuoy, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export type NoticeTone = "hinweis" | "warnung" | "hilfe";

type ToneDefinition = {
  icon: LucideIcon;
  surface: string;
  iconColor: string;
  /** Was der Screenreader vor dem Text hoert. */
  prefix: string;
};

const TONES: Record<NoticeTone, ToneDefinition> = {
  hinweis: {
    icon: Info,
    surface: "border-input bg-card text-card-foreground",
    iconColor: "text-primary",
    prefix: "Hinweis",
  },
  warnung: {
    icon: AlertTriangle,
    surface: "border-destructive bg-card text-card-foreground",
    iconColor: "text-destructive",
    prefix: "Warnung",
  },
  hilfe: {
    icon: LifeBuoy,
    surface: "border-accent bg-secondary text-secondary-foreground",
    iconColor: "text-foreground",
    prefix: "Hilfe",
  },
};

type NoticeBannerProps = {
  tone: NoticeTone;
  title: string;
  children?: React.ReactNode;
  /** Wenn gesetzt, laesst sich das Banner schliessen. */
  onDismiss?: () => void;
  className?: string;
};

export function NoticeBanner({
  tone,
  title,
  children,
  onDismiss,
  className,
}: NoticeBannerProps) {
  const definition = TONES[tone];

  return (
    <div
      role={tone === "warnung" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        definition.surface,
        className,
      )}
    >
      <span className={cn("mt-1", definition.iconColor)}>
        <Icon icon={definition.icon} />
      </span>

      <div className="flex-1">
        <p className="text-label">
          <span className="sr-only">{definition.prefix}: </span>
          {title}
        </p>
        {children ? <div className="mt-2 text-small">{children}</div> : null}
      </div>

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="focus-ring hit-area -m-1 inline-flex items-center justify-center rounded-md text-foreground transition-colors duration-fast hover:bg-muted"
        >
          <Icon icon={X} />
          <span className="sr-only">Hinweis schließen</span>
        </button>
      ) : null}
    </div>
  );
}
