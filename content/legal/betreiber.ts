import { placeholderText, type PlaceholderId } from "./platzhalter";

/**
 * Angaben zum Betreiber.
 *
 * Bewusst hier und nicht im Seitencode: ein Wechsel der Rechtsform oder der
 * Anschrift soll keine Änderung an einer Seite erfordern.
 *
 * Alle Felder stehen derzeit auf Platzhalter. Es lagen keine Angaben vor, und
 * eine Firmierung oder Anschrift zu erfinden wäre schlimmer als eine sichtbare
 * Lücke — im Impressum ist eine falsche Angabe abmahnfähig, eine erkennbar
 * offene Stelle nicht.
 */

export type BetreiberFeld = {
  /** Der einzusetzende Wert, sobald er vorliegt. */
  wert: string | null;
  /** Solange nichts vorliegt: welcher Platzhalter greift. */
  platzhalter: PlaceholderId;
};

export const BETREIBER = {
  name: { wert: null, platzhalter: "betreiberName" },
  anschrift: { wert: null, platzhalter: "betreiberAnschrift" },
  email: { wert: null, platzhalter: "betreiberEmail" },
  verantwortlicher: { wert: null, platzhalter: "betreiberVerantwortlicher" },
  rechtsform: { wert: null, platzhalter: "betreiberRechtsform" },
  register: { wert: null, platzhalter: "betreiberRegister" },
  umsatzsteuerId: { wert: null, platzhalter: "betreiberUmsatzsteuerId" },
} as const satisfies Record<string, BetreiberFeld>;

export type BetreiberSchluessel = keyof typeof BETREIBER;

/** Der anzuzeigende Text: der echte Wert oder der Platzhalter. */
export function betreiber(feld: BetreiberSchluessel): string {
  const eintrag = BETREIBER[feld];
  return eintrag.wert ?? placeholderText(eintrag.platzhalter);
}

/** Wahr, solange für dieses Feld nichts vorliegt. */
export function istPlatzhalter(feld: BetreiberSchluessel): boolean {
  return BETREIBER[feld].wert === null;
}
