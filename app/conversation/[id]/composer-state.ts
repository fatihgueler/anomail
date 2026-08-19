/**
 * Zustand des Schreibfelds.
 *
 * Bewusst ausserhalb von actions.ts: eine Datei mit "use server" darf
 * ausschliesslich async-Funktionen exportieren. Eine Konstante daneben laesst
 * den Build durchlaufen und bricht erst beim ersten Absenden zur Laufzeit.
 */
export type ComposerState = {
  status:
    | "idle"
    | "invalid"
    | "not-allowed"
    | "archived"
    | "rate-limited"
    | "failed"
    | "sent";
  message?: string;
  showCrisisNotice?: boolean;
};

export const COMPOSER_INITIAL_STATE: ComposerState = { status: "idle" };
