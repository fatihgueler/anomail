import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge kennt nur die Standard-Skalen von Tailwind.
 *
 * Das Projekt benennt seine Token aber selbst: `border-control` ist eine
 * Rahmenbreite, `text-body` eine Schriftgroesse. Ohne diese Ergaenzung raet
 * tailwind-merge anhand des Praefixes - und raet falsch. `border-control` galt
 * ihm als Rahmenfarbe und wurde deshalb von `border-primary` verdraengt: der
 * Sekundaer-Button stand ohne Rahmen da und sah aus wie blosser Text.
 *
 * Die Ergaenzung muss mitwachsen. Kommt in tailwind.config.ts ein eigener
 * Skalenwert dazu, gehoert er auch hierher - tests/ui/klassen.test.ts haelt
 * beide Listen deckungsgleich.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "border-w": [{ border: ["control", "accentbar"] }],
      "font-size": [
        {
          text: [
            "display",
            "title",
            "subtitle",
            "lead",
            "body",
            "small",
            "label",
            "kennung",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
