"use client";

import { Mail, MailCheck } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Feld } from "@/components/ui/feld";
import { Icon } from "@/components/ui/icon";

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

  const hatFehler = state.status === "error";
  const verschickt = state.status === "verschickt";

  if (verschickt) {
    return <Bestaetigung email={state.email} />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {weiter ? <input type="hidden" name="weiter" value={weiter} /> : null}

      <Feld
        label="E-Mail-Adresse"
        hinweis="Wir schicken dir einen Anmeldelink. Ein Passwort brauchst du nicht."
        fehler={hatFehler ? state.message : undefined}
        icon={Mail}
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.email}
        disabled={pending}
      />

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

/**
 * Der Erfolgszustand.
 *
 * Er ersetzt das Formular an Ort und Stelle, statt auf eine andere Seite zu
 * wechseln. role="status" mit aria-live sorgt dafuer, dass auch angesagt wird,
 * was passiert ist - sonst waere fuer Screenreader-Nutzer einfach das
 * Formular verschwunden.
 */
function Bestaetigung({ email }: { email?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-reveal="sichtbar"
      className="flex flex-col items-start gap-4"
    >
      <span className="text-primary">
        <Icon icon={MailCheck} />
      </span>

      <h3 className="font-serif text-subtitle text-card-foreground">
        Schau in dein Postfach
      </h3>

      <p className="max-w-prose text-body text-muted-foreground">
        {email ? (
          <>
            Wir haben den Anmeldelink an{" "}
            <span className="font-semibold text-card-foreground">{email}</span>{" "}
            geschickt. Er gilt 15 Minuten und funktioniert einmal.
          </>
        ) : (
          <>
            Wir haben den Anmeldelink verschickt. Er gilt 15 Minuten und
            funktioniert einmal.
          </>
        )}
      </p>

      <p className="max-w-prose text-small text-muted-foreground">
        Nichts angekommen? Sieh im Spam-Ordner nach. Du kannst die Seite neu
        laden und es noch einmal versuchen.
      </p>
    </div>
  );
}
