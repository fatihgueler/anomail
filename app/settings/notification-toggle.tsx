"use client";

import * as React from "react";

import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { setNotificationPreferenceAction } from "@/lib/actions/moderation-actions";

/**
 * Schalter fuer Benachrichtigungen.
 *
 * Der angezeigte Zustand folgt der Eingabe sofort und faellt zurueck, wenn das
 * Speichern scheitert - ein Schalter, der stillschweigend nicht speichert,
 * waere schlimmer als eine Fehlermeldung.
 */
export function NotificationToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = React.useState(initial);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | undefined>();
  const [status, setStatus] = React.useState("");

  return (
    <>
      <ToggleSwitch
        label="Benachrichtigungen"
        description="Wir sagen dir Bescheid, wenn jemand auf deinen Brief geantwortet hat."
        checked={enabled}
        disabled={pending}
        error={error}
        onCheckedChange={(next) => {
          const previous = enabled;
          setEnabled(next);
          setError(undefined);

          startTransition(async () => {
            const failure = await setNotificationPreferenceAction(next);

            if (failure) {
              setEnabled(previous);
              setError(failure);
              return;
            }

            setStatus(
              next
                ? "Benachrichtigungen sind eingeschaltet."
                : "Benachrichtigungen sind ausgeschaltet.",
            );
          });
        }}
      />

      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
    </>
  );
}
