"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { cn } from "@/lib/utils";

import { deleteAccountAction } from "./actions";
import { DELETE_INITIAL_STATE, type DeleteFormState } from "./form-state";

/**
 * Formular zur Kontoauflösung.
 *
 * Drei Hürden, absichtlich: Haken setzen, die eigene Anomail-ID abtippen, und
 * ein Bestätigungsdialog in Gefahr-Stufe. Beide Eingaben werden serverseitig
 * erneut geprüft — das Formular ist die Rückmeldung, nicht die Entscheidung.
 */
export function DeleteAccountForm({ anomailId }: { anomailId: string }) {
  const [state, formAction, pending] = React.useActionState<
    DeleteFormState,
    FormData
  >(deleteAccountAction, DELETE_INITIAL_STATE);

  const [bestaetigt, setBestaetigt] = React.useState(false);
  const [kennung, setKennung] = React.useState("");

  const formRef = React.useRef<HTMLFormElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const checkboxId = React.useId();
  const kennungId = `${checkboxId}-kennung`;
  const fehlerId = `${checkboxId}-fehler`;

  const hatFehler = state.status !== "idle";

  return (
    <>
      <form ref={formRef} action={formAction} className="flex max-w-prose flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor={checkboxId}
            className="hit-area flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 text-body text-foreground focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
          >
            <input
              id={checkboxId}
              name="bestaetigt"
              type="checkbox"
              value="ja"
              checked={bestaetigt}
              disabled={pending}
              onChange={(event) => setBestaetigt(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-primary"
            />
            <span>
              Ich möchte mein Konto löschen. Mir ist bewusst, dass das sofort
              geschieht und sich nicht rückgängig machen lässt.
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={kennungId} className="text-label text-foreground">
            Tipp zur Bestätigung deine Anomail-ID ab
          </label>

          <p className="text-small text-muted-foreground">
            Deine Kennung lautet{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {anomailId}
            </span>
            .
          </p>

          <input
            id={kennungId}
            name="anomailId"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={kennung}
            disabled={pending}
            onChange={(event) => setKennung(event.target.value.toUpperCase())}
            aria-invalid={state.status === "mismatch" ? true : undefined}
            aria-describedby={hatFehler ? fehlerId : undefined}
            placeholder="AN-XXXX-XXXX"
            className={cn(
              "focus-ring h-control w-full rounded-lg border bg-card px-4",
              "text-body tabular-nums text-card-foreground placeholder:text-muted-foreground",
              "transition-colors duration-fast",
              state.status === "mismatch"
                ? "border-destructive"
                : "border-input hover:border-primary",
              "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
            )}
          />
        </div>

        {hatFehler ? (
          <div id={fehlerId}>
            <NoticeBanner tone="warnung" title="Dein Konto wurde nicht gelöscht">
              <p>{state.message}</p>
            </NoticeBanner>
          </div>
        ) : null}

        <div>
          <Button
            ref={triggerRef}
            type="button"
            variant="danger"
            loading={pending}
            loadingLabel="Konto wird gelöscht"
            className="whitespace-nowrap"
            onConfirm={() => {
              // Der Gefahr-Button aus AP1 bringt den Bestätigungsdialog mit.
              formRef.current?.requestSubmit();
            }}
            confirmTitle="Konto endgültig löschen?"
            confirmDescription="Deine E-Mail-Adresse und deine Anomail-ID werden entfernt, wartende Briefe verschwinden, und deine Nachrichten werden geleert. Das geschieht sofort und lässt sich nicht rückgängig machen."
            confirmLabel="Ja, Konto löschen"
            cancelLabel="Abbrechen"
          >
            Konto löschen
          </Button>
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {pending ? "Dein Konto wird gelöscht." : (state.message ?? "")}
        </p>
      </form>
    </>
  );
}
