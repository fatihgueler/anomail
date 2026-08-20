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
  | "accent-hover"
  | "accent-active"
  | "accent-soft"
  | "destructive"
  | "destructive-foreground"
  | "destructive-hover"
  | "destructive-active"
  | "border"
  | "input"
  | "ring"
  | "desk"
  | "desk-foreground";

export type Palette = Record<TokenName, string>;

export const LIGHT_PALETTE: Palette = {
  background: "40 26% 96%",
  foreground: "30 12% 14%",
  card: "42 40% 99%",
  "card-foreground": "30 12% 14%",
  primary: "218 38% 30%",
  "primary-foreground": "42 40% 99%",
  "primary-hover": "218 40% 24%",
  "primary-active": "218 44% 18%",
  secondary: "38 22% 92%",
  "secondary-foreground": "30 12% 14%",
  muted: "38 18% 89%",
  "muted-foreground": "30 8% 34%",
  accent: "334 24% 40%",
  "accent-foreground": "42 40% 99%",
  "accent-hover": "334 26% 33%",
  "accent-active": "334 28% 26%",
  "accent-soft": "334 28% 92%",
  destructive: "358 52% 40%",
  "destructive-foreground": "42 40% 99%",
  "destructive-hover": "358 54% 33%",
  "destructive-active": "358 56% 26%",
  border: "38 16% 84%",
  input: "34 12% 44%",
  ring: "218 38% 30%",
  desk: "32 14% 18%",
  "desk-foreground": "40 26% 94%",
};

export const DARK_PALETTE: Palette = {
  background: "218 22% 10%",
  foreground: "40 20% 92%",
  card: "218 18% 14%",
  "card-foreground": "40 20% 92%",
  primary: "214 60% 74%",
  "primary-foreground": "218 40% 12%",
  "primary-hover": "214 62% 80%",
  "primary-active": "214 64% 86%",
  secondary: "218 14% 20%",
  "secondary-foreground": "40 20% 92%",
  muted: "218 14% 17%",
  "muted-foreground": "40 10% 70%",
  accent: "334 42% 72%",
  "accent-foreground": "334 30% 14%",
  "accent-hover": "334 46% 78%",
  "accent-active": "334 50% 84%",
  "accent-soft": "334 20% 24%",
  destructive: "358 62% 72%",
  "destructive-foreground": "358 40% 12%",
  "destructive-hover": "358 66% 79%",
  "destructive-active": "358 70% 85%",
  border: "218 12% 26%",
  input: "218 10% 52%",
  ring: "214 60% 74%",
  /*
   * Heller als der Seitenhintergrund, nicht dunkler.
   *
   * Im Hellen liegt das Blatt auf einem dunklen Pult. Im Dunkeln ist die
   * Seite selbst schon Tinte - ein noch dunkleres Feld waere darin nicht mehr
   * zu erkennen und das invertierte Abschlussfeld verschwaende. Die Metapher
   * kippt hier bewusst: das Pult wird zur angehobenen Flaeche.
   */
  desk: "218 16% 17%",
  "desk-foreground": "40 20% 92%",
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
  /* --------------------------------------------------------------- */
  /* Redesign: die zweite Tinte                                       */
  /* --------------------------------------------------------------- */
  /*
   * --accent war frueher eine reine Zierfarbe und durfte nie Schrift sein.
   * Seit dem Redesign ist es die zweite Tinte und traegt die Zuhoeren-Rolle -
   * also gilt jetzt die volle Textanforderung statt einer Ausnahme. Das ist
   * eine Verschaerfung, keine Lockerung: aus 1:1 wird 4,5:1.
   */
  {
    usage: "Zuhoeren-Rolle, Schrift auf Seitenhintergrund",
    foreground: "accent",
    background: "background",
    requirement: "text",
  },
  {
    usage: "Zuhoeren-Rolle, Schrift auf Karte",
    foreground: "accent",
    background: "card",
    requirement: "text",
  },
  {
    usage: "Zuhoeren-Button, Schrift auf Flaeche",
    foreground: "accent-foreground",
    background: "accent",
    requirement: "text",
  },
  {
    usage: "Zuhoeren-Button beim Hovern, Schrift auf Flaeche",
    foreground: "accent-foreground",
    background: "accent-hover",
    requirement: "text",
  },
  {
    usage: "Zuhoeren-Button beim Druecken, Schrift auf Flaeche",
    foreground: "accent-foreground",
    background: "accent-active",
    requirement: "text",
  },
  {
    usage: "Schrift auf zarter Akzentflaeche",
    foreground: "foreground",
    background: "accent-soft",
    requirement: "text",
  },
  {
    usage: "Zweite Tinte auf zarter Akzentflaeche",
    foreground: "accent",
    background: "accent-soft",
    requirement: "text",
  },

  /* --------------------------------------------------------------- */
  /* Das Pult: invertierte Abschnitte und Fussleiste                  */
  /* --------------------------------------------------------------- */
  {
    usage: "Abschluss-Aufruf und Fussleiste, Schrift auf Pultflaeche",
    foreground: "desk-foreground",
    background: "desk",
    requirement: "text",
  },
  /*
   * Flaeche gegen Flaeche, deshalb zierend.
   *
   * Der Abschluss-Aufruf ist nicht daran erkennbar, dass sich seine Flaeche
   * abhebt, sondern an seiner Ueberschrift und seinem Text. Die Karte wird
   * gegen den Seitenhintergrund aus demselben Grund nirgends auf 3:1 geprueft.
   * Der Wert steht trotzdem in der Tabelle.
   */
  {
    usage: "Pultflaeche gegen Seitenhintergrund",
    foreground: "desk",
    background: "background",
    requirement: "decorative",
  },

  /*
   * Rein zierend.
   *
   * --border trennt Abschnitte, umrandet Karten und zeichnet die Falz. AP2
   * hat dafuer bewusst zwei Tokens getrennt: --border fuer Zierlinien,
   * --input fuer die Grenzen von Bedienelementen. Nur --input muss 3:1
   * erreichen. Der Wert steht trotzdem in der Tabelle, damit er nicht aus
   * dem Blick geraet.
   */
  {
    usage: "Falz und Zierlinie zwischen Abschnitten, um Karten",
    foreground: "border",
    background: "card",
    requirement: "decorative",
  },
  {
    usage: "Zarte Akzentflaeche gegen Seitenhintergrund",
    foreground: "accent-soft",
    background: "background",
    requirement: "decorative",
  },
];
