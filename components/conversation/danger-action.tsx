"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

/**
 * Eine zerstoerende Aktion in Gefahr-Stufe, mit Bestaetigung.
 *
 * Der Gefahr-Button aus AP1 verlangt ohnehin ein onConfirm und zeigt vorher
 * einen Bestaetigungsdialog. Hier kommt nur das Anstossen der Serveraktion
 * dazu, samt Ladezustand und sichtbarer Fehlermeldung - eine gescheiterte
 * Loeschung darf nicht stillschweigend verpuffen.
 */

type DangerActionProps = {
  label: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmLabel: string;
  /** Serveraktion. Gibt eine Fehlermeldung zurueck oder nichts bei Erfolg. */
  action: () => Promise<string | undefined>;
};

export function DangerAction({
  label,
  confirmTitle,
  confirmDescription,
  confirmLabel,
  action,
}: DangerActionProps) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | undefined>();

  return (
    <Button
      variant="danger"
      loading={pending}
      loadingLabel="Wird ausgeführt"
      error={error}
      className="whitespace-nowrap"
      onConfirm={() => {
        setError(undefined);
        startTransition(async () => {
          const message = await action();

          if (message) {
            setError(message);
          }
        });
      }}
      confirmTitle={confirmTitle}
      confirmDescription={confirmDescription}
      confirmLabel={confirmLabel}
    >
      {label}
    </Button>
  );
}
