/**
 * Zustand des Antwortformulars.
 *
 * Bewusst ausserhalb von actions.ts: eine Datei mit "use server" darf
 * ausschliesslich async-Funktionen exportieren. Eine Konstante daneben laesst
 * den Build durchlaufen und bricht erst beim ersten Absenden zur Laufzeit.
 */
export type ReplyFormState = {
  status: "idle" | "invalid" | "not-assigned" | "rate-limited" | "failed" | "sent";
  message?: string;
  showCrisisNotice?: boolean;
};

export const REPLY_INITIAL_STATE: ReplyFormState = { status: "idle" };
