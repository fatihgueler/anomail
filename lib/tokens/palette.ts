/**
 * Die Farb-Tokens als Daten.
 *
 * Diese Datei ist die Quelle fuer die Kontrastpruefung auf /dev/ui und muss
 * mit den CSS-Variablen in app/globals.css uebereinstimmen.
 */

import type { ContrastRequirement } from "./contrast";

export type ThemeName = "light" | "dark";

export type TokenName =
  | "background"
  | "foreground"
  | "card"
  | "card-foreground"
  | "primary"
  | "primary-foreground"
  | "primary-hover"
  | "primary-active"
  | "secondary"
  | "secondary-foreground"
  | "muted"
  | "muted-foreground"
  | "accent"
  | "accent-foreground"
  | "destructive"
  | "destructive-foreground"
  | "destructive-hover"
  | "destructive-active"
  | "border"
  | "input"
  | "ring";

export type Palette = Record<TokenName, string>;

export const LIGHT_PALETTE: Palette = {
  background: "38 42% 76%",
  foreground: "0 0% 12%",
  card: "0 0% 100%",
  "card-foreground": "0 0% 12%",
  primary: "229 69% 46%",
  "primary-foreground": "0 0% 100%",
  "primary-hover": "229 69% 38%",
  "primary-active": "229 69% 31%",
  secondary: "38 38% 88%",
  "secondary-foreground": "0 0% 12%",
  muted: "38 32% 90%",
  "muted-foreground": "0 0% 32%",
  accent: "43 45% 58%",
  "accent-foreground": "0 0% 12%",
  destructive: "0 72% 37%",
  "destructive-foreground": "0 0% 100%",
  "destructive-hover": "0 72% 30%",
  "destructive-active": "0 72% 24%",
  border: "38 28% 72%",
  input: "38 28% 38%",
  ring: "229 69% 46%",
};

export const DARK_PALETTE: Palette = {
  background: "38 12% 10%",
  foreground: "38 15% 94%",
  card: "38 10% 14%",
  "card-foreground": "38 15% 94%",
  primary: "229 78% 76%",
  "primary-foreground": "229 60% 12%",
  "primary-hover": "229 78% 80%",
  "primary-active": "229 78% 86%",
  secondary: "38 10% 20%",
  "secondary-foreground": "38 15% 94%",
  muted: "38 10% 18%",
  "muted-foreground": "38 12% 72%",
  accent: "43 40% 52%",
  "accent-foreground": "0 0% 12%",
  destructive: "0 76% 71%",
  "destructive-foreground": "0 0% 12%",
  "destructive-hover": "0 76% 78%",
  "destructive-active": "0 76% 84%",
  border: "38 10% 26%",
  input: "38 12% 46%",
  ring: "229 78% 76%",
};

export const PALETTES: Record<ThemeName, Palette> = {
  light: LIGHT_PALETTE,
  dark: DARK_PALETTE,
};

export type ContrastPair = {
  /** Wo diese Kombination im Produkt auftritt. */
  usage: string;
  foreground: TokenName;
  background: TokenName;
  requirement: ContrastRequirement;
};

/**
 * Jede Kombination, die im Komponentencode tatsaechlich vorkommt.
 * Kombinationen, die es nicht gibt, stehen bewusst nicht in dieser Liste.
 */
export const CONTRAST_PAIRS: ContrastPair[] = [
  {
    usage: "Fliesstext auf Seitenhintergrund",
    foreground: "foreground",
    background: "background",
    requirement: "text",
  },
  {
    usage: "Metadaten auf Seitenhintergrund",
    foreground: "muted-foreground",
    background: "background",
    requirement: "text",
  },
  {
    usage: "Fliesstext auf Karte",
    foreground: "card-foreground",
    background: "card",
    requirement: "text",
  },
  {
    usage: "Metadaten auf Karte",
    foreground: "muted-foreground",
    background: "card",
    requirement: "text",
  },
  {
    usage: "Primaer-Button, Schrift auf Flaeche",
    foreground: "primary-foreground",
    background: "primary",
    requirement: "text",
  },
  {
    usage: "Sekundaer-Button, Schrift auf Seitenhintergrund",
    foreground: "primary",
    background: "background",
    requirement: "text",
  },
  {
    usage: "Sekundaer-Button, Schrift auf Karte",
    foreground: "primary",
    background: "card",
    requirement: "text",
  },
  {
    usage: "Gefahr-Button, Schrift auf Seitenhintergrund",
    foreground: "destructive",
    background: "background",
    requirement: "text",
  },
  {
    usage: "Gefahr-Button, Schrift auf Karte",
    foreground: "destructive",
    background: "card",
    requirement: "text",
  },
  {
    usage: "Primaer-Button beim Hovern, Schrift auf Flaeche",
    foreground: "primary-foreground",
    background: "primary-hover",
    requirement: "text",
  },
  {
    usage: "Primaer-Button beim Druecken, Schrift auf Flaeche",
    foreground: "primary-foreground",
    background: "primary-active",
    requirement: "text",
  },
  {
    usage: "Sekundaer-Button beim Hovern, Schrift auf Sekundaerflaeche",
    foreground: "primary-hover",
    background: "secondary",
    requirement: "text",
  },
  {
    usage: "Gefahr-Button beim Hovern, Schrift auf Sekundaerflaeche",
    foreground: "destructive-hover",
    background: "secondary",
    requirement: "text",
  },
  {
    usage: "Deaktivierter Button, Schrift auf gedaempfter Flaeche",
    foreground: "muted-foreground",
    background: "muted",
    requirement: "text",
  },
  {
    usage: "Schrift auf Sekundaerflaeche",
    foreground: "secondary-foreground",
    background: "secondary",
    requirement: "text",
  },
  {
    usage: "Metadaten auf Sekundaerflaeche",
    foreground: "muted-foreground",
    background: "secondary",
    requirement: "text",
  },
  {
    usage: "Schrift auf gedaempfter Flaeche",
    foreground: "foreground",
    background: "muted",
    requirement: "text",
  },
  {
    usage: "Metadaten auf gedaempfter Flaeche, geloeschte Nachricht",
    foreground: "muted-foreground",
    background: "muted",
    requirement: "text",
  },
  {
    usage: "Status zurueckgehalten, Schrift auf gedaempfter Flaeche",
    foreground: "destructive",
    background: "muted",
    requirement: "text",
  },
  {
    usage: "Status beantwortet, Schrift auf Akzentflaeche",
    foreground: "accent-foreground",
    background: "accent",
    requirement: "text",
  },
  {
    usage: "Status in Bearbeitung, Schrift auf Sekundaerflaeche",
    foreground: "primary",
    background: "secondary",
    requirement: "text",
  },
  {
    usage: "Eingabefeld-Rahmen gegen Seitenhintergrund",
    foreground: "input",
    background: "background",
    requirement: "ui",
  },
  {
    usage: "Eingabefeld-Rahmen gegen Karte",
    foreground: "input",
    background: "card",
    requirement: "ui",
  },
  {
    usage: "Fokusring gegen Seitenhintergrund",
    foreground: "ring",
    background: "background",
    requirement: "ui",
  },
  {
    usage: "Fokusring gegen Karte",
    foreground: "ring",
    background: "card",
    requirement: "ui",
  },
  {
    usage: "Primaerflaeche gegen Seitenhintergrund",
    foreground: "primary",
    background: "background",
    requirement: "ui",
  },

  /* --------------------------------------------------------------- */
  /* Ab AP4 hinzugekommen                                             */
  /* --------------------------------------------------------------- */
  {
    usage: "Umschalter und Filterknoepfe, Schrift auf Sekundaerflaeche",
    foreground: "foreground",
    background: "secondary",
    requirement: "text",
  },
  {
    usage: "Fliesstext auf Karte ueber die Vordergrundfarbe",
    foreground: "foreground",
    background: "card",
    requirement: "text",
  },
  {
    usage: "Zitierter fremder Inhalt in der Moderation",
    foreground: "secondary-foreground",
    background: "secondary",
    requirement: "text",
  },
  {
    usage: "Gefahr-Aktion in der Moderation, Schrift auf Sekundaerflaeche",
    foreground: "destructive",
    background: "secondary",
    requirement: "text",
  },
  {
    usage: "Status in Bearbeitung auf gedaempfter Flaeche",
    foreground: "primary",
    background: "muted",
    requirement: "text",
  },
  {
    usage: "Kartentext auf gedaempfter Flaeche",
    foreground: "card-foreground",
    background: "muted",
    requirement: "text",
  },
  {
    usage: "Risikostufe Krise, Schrift auf Gefahrenflaeche",
    foreground: "destructive-foreground",
    background: "destructive",
    requirement: "text",
  },
  {
    usage: "Platzhalter der Rechtstexte, Schrift auf gedaempfter Flaeche",
    foreground: "destructive",
    background: "muted",
    requirement: "text",
  },
  /*
   * Die beiden folgenden Kombinationen sind rein zierend.
   *
   * Der Akzentbalken steht am Ursprungsbrief und am zitierten Inhalt - beide
   * tragen die Bedeutung zusaetzlich im Text ("· Ursprünglicher Brief",
   * daruebergesetzte Ueberschrift). Faellt der Balken weg, geht keine
   * Information verloren.
   *
   * --border trennt Abschnitte und umrandet Karten. AP2 hat dafuer bewusst
   * zwei Tokens getrennt: --border fuer Zierlinien, --input fuer die Grenzen
   * von Bedienelementen. Nur --input muss 3:1 erreichen, und tut das auch
   * (3,28:1 hell, 4,04:1 dunkel).
   */
  {
    usage: "Akzentbalken am Ursprungsbrief, neben der Beschriftung",
    foreground: "accent",
    background: "secondary",
    requirement: "decorative",
  },
  {
    usage: "Zierlinie zwischen Abschnitten und um Karten",
    foreground: "border",
    background: "card",
    requirement: "decorative",
  },
];
