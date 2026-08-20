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
    "text-body font-semibold",
    // Nicht nur die Farbe: Anheben beim Hovern, Eindruecken beim Klicken.
    "transition-[background-color,color,border-color,box-shadow,transform] duration-base ease-out",
    "disabled:cursor-not-allowed",
    "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
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
          "bg-primary text-primary-foreground shadow-paper-1",
          "hover:bg-primary-hover hover:-translate-y-px hover:shadow-paper-2",
          "active:bg-primary-active active:translate-y-0 active:scale-[0.98] active:shadow-paper-1",
          "disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none",
          "disabled:hover:translate-y-0 disabled:hover:shadow-none",
        ),
        /*
         * Die zweite Tinte. Traegt die Zuhoeren-Rolle - dieselbe Wichtigkeit
         * wie Schreiben, aber eine andere Handlung, deshalb eine andere Farbe
         * statt einer schwaecheren Stufe derselben.
         */
        accent: cn(
          "min-h-control px-6 py-2",
          "bg-accent text-accent-foreground shadow-paper-1",
          "hover:bg-accent-hover hover:-translate-y-px hover:shadow-paper-2",
          "active:bg-accent-active active:translate-y-0 active:scale-[0.98] active:shadow-paper-1",
          "disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none",
          "disabled:hover:translate-y-0 disabled:hover:shadow-none",
        ),
        secondary: cn(
          "min-h-control px-6 py-2",
          "border-control border-primary bg-transparent text-primary",
          "hover:bg-secondary hover:text-primary-hover hover:-translate-y-px",
          "active:bg-muted active:text-primary-active active:translate-y-0 active:scale-[0.98]",
          "disabled:border-input disabled:bg-transparent disabled:text-muted-foreground",
          "disabled:hover:translate-y-0",
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
