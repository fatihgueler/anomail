import { randomInt } from "node:crypto";

/**
 * Erzeugung der Anomail-ID.
 *
 * Die ID ist das Einzige, was Briefpartner voneinander sehen. Sie muss sich
 * vorlesen und abtippen lassen, deshalb fehlen I, O, 0 und 1 im Alphabet.
 */

export const ANOMAIL_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const ANOMAIL_ID_PATTERN =
  /^AN-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

/** Nach so vielen vergeblichen Einfuegeversuchen gilt die Vergabe als gescheitert. */
export const ANOMAIL_ID_MAX_ATTEMPTS = 5;

const BLOCK_LENGTH = 4;

function randomBlock(): string {
  let block = "";

  for (let index = 0; index < BLOCK_LENGTH; index += 1) {
    // randomInt kommt aus node:crypto und ist gleichverteilt.
    // Math.random waere hier vorhersagbar und damit ungeeignet.
    block += ANOMAIL_ID_ALPHABET[randomInt(ANOMAIL_ID_ALPHABET.length)];
  }

  return block;
}

/** Erzeugt eine Kennung der Form AN-K7QM-3XPF. */
export function generateAnomailId(): string {
  return `AN-${randomBlock()}-${randomBlock()}`;
}

export function isValidAnomailId(value: string): boolean {
  return ANOMAIL_ID_PATTERN.test(value);
}

/**
 * Fehler der ID-Vergabe.
 * Eigener Typ, damit der Aufrufer ihn von einem beliebigen Datenbankfehler
 * unterscheiden und gezielt protokollieren kann.
 */
export class AnomailIdAssignmentError extends Error {
  readonly attempts: number;

  constructor(attempts: number, options?: { cause?: unknown }) {
    super(
      `Anomail-ID konnte nach ${attempts} Versuchen nicht vergeben werden.`,
      options,
    );
    this.name = "AnomailIdAssignmentError";
    this.attempts = attempts;
  }
}
