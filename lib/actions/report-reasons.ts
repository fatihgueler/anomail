/**
 * Meldegruende und Grenzen.
 *
 * Bewusst ausserhalb von report.ts: dieses Modul wird auch von
 * Client-Komponenten gelesen, und report.ts ist mit "server-only" markiert.
 * Hier stehen ausschliesslich Konstanten ohne Datenbankbezug.
 */

export const REPORT_REASONS = [
  { value: "belaestigung", label: "Belästigung" },
  { value: "beleidigung", label: "Beleidigung" },
  { value: "bedrohung", label: "Bedrohung" },
  { value: "sexuelle_inhalte", label: "Sexuelle Inhalte" },
  { value: "persoenliche_daten", label: "Persönliche Daten" },
  { value: "spam", label: "Spam" },
  { value: "gefaehrliche_inhalte", label: "Gefährliche Inhalte" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export type ReportTargetType = "letter" | "message" | "conversation";

export const REPORT_NOTE_MAX_LENGTH = 1000;

export function isReportReason(value: string): value is ReportReason {
  return REPORT_REASONS.some((entry) => entry.value === value);
}
