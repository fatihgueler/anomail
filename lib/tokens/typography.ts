/**
 * Typografie-Skala und Abstands-Raster als Daten.
 * Spiegelt tailwind.config.ts und dient der Uebersichtsseite als Referenz.
 */

export type TypeStep = {
  name: string;
  className: string;
  usage: string;
  size: string;
  lineHeight: string;
  weight: string;
  tracking: string;
};

export const TYPE_SCALE: TypeStep[] = [
  {
    name: "Display",
    className: "text-display",
    usage: "Seitentitel",
    size: "32px",
    lineHeight: "38px",
    weight: "700",
    tracking: "-0.02em",
  },
  {
    name: "Titel",
    className: "text-title",
    usage: "Kartenueberschriften",
    size: "24px",
    lineHeight: "30px",
    weight: "700",
    tracking: "-0.01em",
  },
  {
    name: "Untertitel",
    className: "text-subtitle",
    usage: "Abschnittskoepfe",
    size: "18px",
    lineHeight: "26px",
    weight: "600",
    tracking: "normal",
  },
  {
    name: "Body",
    className: "text-body",
    usage: "Fliesstext, Briefe",
    size: "16px",
    lineHeight: "26px",
    weight: "400",
    tracking: "normal",
  },
  {
    name: "Klein",
    className: "text-small",
    usage: "Metadaten, Hilfetexte",
    size: "14px",
    lineHeight: "22px",
    weight: "400",
    tracking: "normal",
  },
  {
    name: "Label",
    className: "text-label",
    usage: "Statuszeilen, Chips",
    size: "14px",
    lineHeight: "18px",
    weight: "600",
    tracking: "0.02em",
  },
];

export type SpacingStep = {
  token: string;
  value: string;
};

/** Verbindliches 8pt-Raster. Andere Schritte gibt es nicht. */
export const SPACING_SCALE: SpacingStep[] = [
  { token: "1", value: "4px" },
  { token: "2", value: "8px" },
  { token: "3", value: "12px" },
  { token: "4", value: "16px" },
  { token: "6", value: "24px" },
  { token: "8", value: "32px" },
  { token: "12", value: "48px" },
  { token: "16", value: "64px" },
];
