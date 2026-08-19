import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Liegt bewusst in einer eigenen Datei: der Dialog braucht die Knopf-Optik
 * fuer seine Fussleiste, soll aber nicht button.tsx importieren muessen.
 * Sonst wuerden sich beide Module gegenseitig laden.
 *
 * Kein Farbverlauf, niemals. Alle Zustaende kommen aus Tokens.
 */
export const buttonVariants = cva(
  cn(
    "focus-ring relative inline-flex items-center justify-center gap-2 rounded-lg",
    "text-body font-semibold transition-colors duration-fast",
    "disabled:cursor-not-allowed",
    // Auf 320px Breite passte eine lange Beschriftung nicht in eine Zeile und
    // schob die Seite waagerecht auf. Der Knopf darf nie breiter werden als
    // sein Platz; die Beschriftung bricht dann um, mittig gesetzt.
    "max-w-full text-center",
  ),
  {
    variants: {
      variant: {
        primary: cn(
          "min-h-control px-6 py-2",
          "bg-primary text-primary-foreground",
          "hover:bg-primary-hover active:bg-primary-active",
          "disabled:bg-muted disabled:text-muted-foreground",
        ),
        secondary: cn(
          "min-h-control px-6 py-2",
          "border-control border-primary bg-transparent text-primary",
          "hover:bg-secondary hover:text-primary-hover",
          "active:bg-muted active:text-primary-active",
          "disabled:border-input disabled:bg-transparent disabled:text-muted-foreground",
        ),
        tertiary: cn(
          "hit-area px-3",
          "bg-transparent text-primary underline-offset-4",
          "hover:bg-secondary hover:text-primary-hover hover:underline",
          "active:bg-muted active:text-primary-active",
          "disabled:bg-transparent disabled:text-muted-foreground disabled:no-underline",
        ),
        danger: cn(
          "hit-area px-3",
          "bg-transparent text-destructive underline-offset-4",
          "hover:bg-secondary hover:text-destructive-hover hover:underline",
          "active:bg-muted active:text-destructive-active",
          "disabled:bg-transparent disabled:text-muted-foreground disabled:no-underline",
        ),
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      block: false,
    },
  },
);
