/**
 * Zustand des Schreibformulars.
 *
 * Bewusst ausserhalb von actions.ts: eine Datei mit "use server" darf
 * ausschliesslich async-Funktionen exportieren. Eine Konstante daneben laesst
 * den Build durchlaufen und bricht erst beim ersten Absenden zur Laufzeit.
 */
export type WriteFormState = {
  status: "idle" | "invalid" | "rate-limited" | "failed" | "sent";
  message?: string;
  field?: "content" | "categories" | "submission";
  /** Nach erfolgreichem Absenden: Krisen-Dialog zeigen statt weiterleiten. */
  showCrisisNotice?: boolean;
};

export const WRITE_INITIAL_STATE: WriteFormState = { status: "idle" };
