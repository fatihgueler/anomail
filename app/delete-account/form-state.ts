/**
 * Zustand des Löschformulars.
 *
 * Bewusst ausserhalb von actions.ts: eine Datei mit "use server" darf
 * ausschliesslich async-Funktionen exportieren.
 */
export type DeleteFormState = {
  status: "idle" | "invalid" | "mismatch" | "failed";
  message?: string;
};

export const DELETE_INITIAL_STATE: DeleteFormState = { status: "idle" };
