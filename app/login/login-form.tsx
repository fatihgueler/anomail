"use client";

import { Mail } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { requestMagicLink, type LoginFormState } from "./actions";

const INITIAL_STATE: LoginFormState = { status: "idle" };

type LoginFormProps = {
  /** Wohin es nach der Anmeldung weitergeht. */
  weiter?: string;
};

export function LoginForm({ weiter }: LoginFormProps) {
  const [state, formAction, pending] = React.useActionState(
    requestMagicLink,
    INITIAL_STATE,
  );

  const fieldId = React.useId();
  const errorId = `${fieldId}-fehler`;
  const hintId = `${fieldId}-hinweis`;
  const hasError = state.status === "error";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {weiter ? <input type="hidden" name="weiter" value={weiter} /> : null}

      <div className="flex flex-col gap-2">
        <label htmlFor={fieldId} className="text-label text-foreground">
          E-Mail-Adresse
        </label>

        <p id={hintId} className="text-small text-muted-foreground">
          Wir schicken dir einen Anmeldelink. Ein Passwort brauchst du nicht.
        </p>

        <input
          id={fieldId}
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          disabled={pending}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={hasError ? `${hintId} ${errorId}` : hintId}
          placeholder="name@beispiel.de"
          className={cn(
            "focus-ring h-control w-full rounded-lg border bg-card px-4",
            "text-body text-card-foreground placeholder:text-muted-foreground",
            "transition-colors duration-fast",
            hasError ? "border-destructive" : "border-input hover:border-primary",
            "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
          )}
        />

        {hasError ? (
          <p id={errorId} role="alert" className="text-small text-destructive">
            {state.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        variant="primary"
        iconLeft={Mail}
        loading={pending}
        loadingLabel="Link wird verschickt"
        block
      >
        Anmeldelink schicken
      </Button>
    </form>
  );
}
