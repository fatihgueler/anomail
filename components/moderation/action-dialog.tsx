"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/dialog";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { cn } from "@/lib/utils";

/**
 * Eine eingreifende Moderationsaktion mit Pflichtbegruendung.
 *
 * Die Begruendung ist hier sichtbar erzwungen und zusaetzlich in der
 * Datenbankfunktion - ein Formular laesst sich umgehen, die Funktion nicht.
 * Sie wird der betroffenen Person an ihrem ausgeblendeten Inhalt und dem
 * Melder unter /my-reports angezeigt (DSA Art. 17).
 */

export const REASON_MAX_LENGTH = 1000;

type ActionDialogProps = {
  /** Beschriftung des Ausloesers. */
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  /** Zweite, ausdrueckliche Bestaetigung - fuer die Kontosperre. */
  requiresSecondConfirmation?: boolean;
  secondConfirmationLabel?: string;
  variant?: "danger" | "tertiary" | "secondary";
  action: (reason: string) => Promise<string | undefined>;
};

export function ActionDialog({
  label,
  title,
  description,
  confirmLabel,
  requiresSecondConfirmation = false,
  secondConfirmationLabel,
  variant = "danger",
  action,
}: ActionDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [done, setDone] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const fieldId = React.useId();
  const errorId = `${fieldId}-fehler`;
  const counterId = `${fieldId}-zaehler`;
  const confirmId = `${fieldId}-bestaetigung`;

  const trimmed = reason.trim();
  const blocked =
    trimmed.length === 0 || (requiresSecondConfirmation && !acknowledged);

  /*
   * Der eingetippte Text bleibt beim erneuten Oeffnen stehen.
   *
   * Die Dialog-Komponente aus AP1 schliesst beim Bestaetigen immer. Faellt die
   * Begruendung durch, sieht der Moderator den Fehler unter dem Ausloeser und
   * kann den Dialog erneut oeffnen - ohne seinen Text zu verlieren. Geleert
   * wird erst nach einer erfolgreichen Aktion.
   */
  React.useEffect(() => {
    if (open) {
      setError(undefined);
    }
  }, [open]);

  const submit = () => {
    if (blocked) {
      setError(
        trimmed.length === 0
          ? "Ohne Begründung geht das nicht. Sie wird der betroffenen Person angezeigt."
          : "Setz den Haken, um die Sperre ausdrücklich zu bestätigen.",
      );
      return;
    }

    setError(undefined);

    startTransition(async () => {
      const failure = await action(trimmed);

      if (failure) {
        setError(failure);
        return;
      }

      setDone("Die Aktion wurde ausgeführt.");
      setReason("");
      setAcknowledged(false);
      setOpen(false);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        ref={triggerRef}
        variant={variant === "danger" ? "tertiary" : variant}
        loading={pending}
        loadingLabel="Wird ausgeführt"
        className={cn(
          "whitespace-nowrap",
          variant === "danger" && "text-destructive hover:text-destructive-hover",
        )}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>

      <p role="status" aria-live="polite" className="sr-only">
        {done ?? ""}
      </p>

      {error && !open ? (
        <NoticeBanner tone="warnung" title="Die Aktion wurde nicht ausgeführt">
          <p>{error}</p>
        </NoticeBanner>
      ) : null}

      <AppDialog
        variant="confirm"
        destructive
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        cancelLabel="Abbrechen"
        onConfirm={submit}
        returnFocusRef={triggerRef}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor={fieldId} className="text-label text-card-foreground">
              Begründung (Pflicht)
            </label>

            <p className="text-small text-muted-foreground">
              Sie wird der betroffenen Person an ihrem Inhalt und dem Melder
              unter Meine Meldungen angezeigt.
            </p>

            <textarea
              id={fieldId}
              rows={4}
              value={reason}
              maxLength={REASON_MAX_LENGTH}
              required
              onChange={(event) => setReason(event.target.value)}
              aria-invalid={error && trimmed.length === 0 ? true : undefined}
              aria-describedby={`${counterId}${error ? ` ${errorId}` : ""}`}
              className={cn(
                "focus-ring w-full resize-y rounded-lg border bg-card p-4",
                "text-body text-card-foreground placeholder:text-muted-foreground",
                "transition-colors duration-fast",
                error && trimmed.length === 0
                  ? "border-destructive"
                  : "border-input hover:border-primary",
              )}
            />

            <p
              id={counterId}
              aria-live="polite"
              className="text-label tabular-nums text-muted-foreground"
            >
              {reason.length} von {REASON_MAX_LENGTH} Zeichen
            </p>
          </div>

          {requiresSecondConfirmation ? (
            <label
              htmlFor={confirmId}
              className="hit-area flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 text-body text-card-foreground focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
            >
              <input
                id={confirmId}
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-primary"
              />
              <span>
                {secondConfirmationLabel ??
                  "Mir ist bewusst, dass diese Person den Dienst danach nicht mehr nutzen kann."}
              </span>
            </label>
          ) : null}

          {error ? (
            <p id={errorId} role="alert" className="text-small text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </AppDialog>
    </div>
  );
}
