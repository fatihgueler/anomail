"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { Icon } from "@/components/ui/icon";
import { useTheme, type ThemePreference } from "@/components/ui/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Hell", icon: Sun },
  { value: "dark", label: "Dunkel", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * Umschalter fuer die Helligkeit. Radiogruppe statt Knopf-Karussell, damit
 * alle drei Zustaende gleichzeitig sichtbar und per Pfeiltaste erreichbar sind.
 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className="rounded-lg border border-input bg-card p-1">
      <legend className="sr-only">Helligkeit auswählen</legend>
      <div className="flex gap-1">
        {OPTIONS.map((option) => {
          const isActive = preference === option.value;

          return (
            <label
              key={option.value}
              className={cn(
                "hit-area flex cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-label transition-colors duration-fast",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-secondary",
                "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
              )}
            >
              <input
                type="radio"
                name="anomail-theme"
                value={option.value}
                checked={isActive}
                onChange={() => setPreference(option.value)}
                className="sr-only"
              />
              <Icon icon={option.icon} />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
