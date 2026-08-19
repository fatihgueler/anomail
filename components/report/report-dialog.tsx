"use client";

import * as React from "react";

import { AppDialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Melde-Dialog.
 *
 * Baut auf der Dialog-Komponente aus AP1 auf, damit Fokus-Trap, aria-modal,
 * Escape und die Rueckgabe des Fokus an den Ausloeser nicht ein zweites Mal
 * entstehen.
 *
 * Der Grund ist mit "Sonstiges" vorbelegt. So gibt es keinen ungueltigen
 * Zustand, in dem der Dialog beim Absenden offen bleiben muesste - und es
 * entspricht dem Vorgehen beim Brief schreiben, wo eine fehlende
 * Kategorienwahl serverseitig ebenfalls zu "Sonstiges" wird.
 */

export const REPORT_NOTE_MAX_LENGTH = 1000;

export type ReportReasonOption = { value: string; label: string };

type ReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reasons: readonly ReportReasonOption[];
  /** Was gemeldet wird, fuer die Ueberschrift. */
  subject: string;
  onSubmit: (reason: string, note: string) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
};

export function ReportDialog({
  open,
  onOpenChange,
  reasons,
  subject,
  onSubmit,
  returnFocusRef,
}: ReportDialogProps) {
  const groupId = React.useId();
  const noteId = `${groupId}-beschreibung`;
  const counterId = `${groupId}-zaehler`;

  const [reason, setReason] = React.useState("sonstiges");
  const [note, setNote] = React.useState("");

  // Bei jedem Oeffnen frisch beginnen, damit keine alte Eingabe stehen bleibt.
  React.useEffect(() => {
    if (open) {
      setReason("sonstiges");
      setNote("");
    }
  }, [open]);

  return (
    <AppDialog
      variant="confirm"
      open={open}
      onOpenChange={onOpenChange}
      title={`${subject} melden`}
      description="Sag uns, was nicht in Ordnung ist. Wir sehen uns die Meldung an."
      confirmLabel="Meldung absenden"
      cancelLabel="Abbrechen"
      onConfirm={() => onSubmit(reason, note)}
      returnFocusRef={returnFocusRef}
    >
      <div className="flex flex-col gap-6">
        <fieldset>
          <legend className="text-label text-card-foreground">
            Was ist der Grund?
          </legend>

          <div className="mt-3 flex flex-col gap-1">
            {reasons.map((option) => {
              const id = `${groupId}-${option.value}`;

              return (
                <label
                  key={option.value}
                  htmlFor={id}
                  className={cn(
                    "hit-area flex cursor-pointer items-center gap-3 rounded-md px-3 text-body",
                    "transition-colors duration-fast hover:bg-secondary",
                    "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
                    reason === option.value
                      ? "text-card-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <input
                    id={id}
                    type="radio"
                    name={groupId}
                    value={option.value}
                    checked={reason === option.value}
                    onChange={() => setReason(option.value)}
                    className="h-4 w-4 shrink-0 accent-primary"
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor={noteId} className="text-label text-card-foreground">
            Beschreibung (freiwillig)
          </label>

          <textarea
            id={noteId}
            rows={4}
            value={note}
            maxLength={REPORT_NOTE_MAX_LENGTH}
            onChange={(event) => setNote(event.target.value)}
            aria-describedby={counterId}
            placeholder="Was sollen wir uns ansehen?"
            className={cn(
              "focus-ring w-full resize-y rounded-lg border border-input bg-card p-4",
              "text-body text-card-foreground placeholder:text-muted-foreground",
              "transition-colors duration-fast hover:border-primary",
            )}
          />

          <p
            id={counterId}
            aria-live="polite"
            className="text-label tabular-nums text-muted-foreground"
          >
            {note.length} von {REPORT_NOTE_MAX_LENGTH} Zeichen
          </p>
        </div>
      </div>
    </AppDialog>
  );
}
