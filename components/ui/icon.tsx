import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type IconProps = {
  icon: LucideIcon;
  className?: string;
};

/**
 * Einheitlicher Rahmen fuer alle Symbole: 20px, Strichstaerke 1.75,
 * immer currentColor und immer aria-hidden.
 *
 * Ein Symbol traegt nie allein die Bedeutung. Jede Verwendung braucht
 * daneben sichtbaren Text oder Text in einer sr-only-Auszeichnung.
 */
export function Icon({ icon: LucideComponent, className }: IconProps) {
  return (
    <LucideComponent
      aria-hidden="true"
      focusable="false"
      width={20}
      height={20}
      strokeWidth={1.75}
      className={cn("shrink-0", className)}
    />
  );
}
