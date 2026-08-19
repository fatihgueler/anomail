"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { unblockAction } from "@/lib/actions/moderation-actions";

/**
 * Aufheben ist sofort wirksam und ohne Rueckfrage.
 * Blockieren braucht eine Bestaetigung - es ist die eingreifendere Richtung.
 */
export function UnblockButton({
  blockedId,
  anomailId,
}: {
  blockedId: string;
  anomailId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | undefined>();
  const [status, setStatus] = React.useState("");

  return (
    <>
      <Button
        variant="secondary"
        loading={pending}
        loadingLabel="Wird aufgehoben"
        error={error}
        className="whitespace-nowrap"
        onClick={() => {
          setError(undefined);
          startTransition(async () => {
            const failure = await unblockAction(blockedId);

            if (failure) {
              setError(failure);
              return;
            }

            setStatus(`Die Blockierung von ${anomailId} ist aufgehoben.`);
            router.refresh();
          });
        }}
      >
        Blockierung aufheben
      </Button>

      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
    </>
  );
}
