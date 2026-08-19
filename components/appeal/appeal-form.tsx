"use client";

import { Scale } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { submitAppealAction } from "@/lib/actions/moderation-server-actions";
import { cn } from "@/lib/utils";

/**
 * Widerspruch gegen eine Moderationsentscheidung.
 *
 * Erreichbar an der Sperrseite und an jedem eigenen ausgeblendeten Inhalt.
 * Ohne diesen Weg waere die Begruendungspflicht eine Einbahnstrasse: die
 * Moderation entscheidet, die betroffene Person kann nichts dagegen sagen.
 */

const MAX_LENGTH = 2000;

type AppealFormProps = {
  targetType: "letter" | "message" | "account";
  targetId: string | null;
  /** Bereits ein Widerspruch eingelegt? Dann nur der Stand. */
  existingStatus?: "open" | "upheld" | "rejected";
  existingDecision?: string | null;
};

const STATUS_TEXT = {
  open: "Dein Widerspruch liegt uns vor. Wir sehen uns die Entscheidung noch einmal an.",
  upheld: "Deinem Widerspruch wurde stattgegeben.",
  rejected: "Dein Widerspruch wurde abgelehnt.",
} as const;

export function AppealForm({
  targetType,
  targetId,
  existingStatus,
  existingDecision,
}: AppealFormProps) {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [result, setResult] = React.useState<
    { ok: boolean; message: string } | undefined
  >();
  const [pending, startTransition] = React.useTransition();

  const fieldId = React.useId();
  const counterId = `${fieldId}-zaehler`;

  if (existingStatus) {
    return (
      <div className="max-w-prose">
        <NoticeBanner tone="hinweis" title="Dein Widerspruch">
          <p>{STATUS_TEXT[existingStatus]}</p>
          {existingDecision ? (
            <p className="mt-2">
              <span className="font-semibold">Begründung: </span>
              {existingDecision}
            </p>
          ) : null}
        </NoticeBanner>
      </div>
    );
  }

  if (result?.ok) {
    return (
      <div className="max-w-prose">
        <NoticeBanner tone="hinweis" title="Dein Widerspruch ist eingegangen">
          <p>{result.message}</p>
        </NoticeBanner>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-3">
        <Button
          variant="secondary"
          iconLeft={Scale}
          className="whitespace-nowrap"
          onClick={() => setOpen(true)}
        >
          Widerspruch einlegen
        </Button>

        {result && !result.ok ? (
          <div className="max-w-prose">
            <NoticeBanner tone="warnung" title="Der Widerspruch wurde nicht gesendet">
              <p>{result.message}</p>
            </NoticeBanner>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className="flex max-w-prose flex-col gap-4"
      action={() => {
        startTransition(async () => {
          const outcome = await submitAppealAction(
            targetType,
            targetId,
            message,
          );

          setResult(outcome);

          if (outcome.ok) {
            setMessage("");
            setOpen(false);
          }
        });
      }}
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={fieldId} className="text-label text-foreground">
          Warum hältst du die Entscheidung für falsch?
        </label>

        <p className="text-small text-muted-foreground">
          Deine Schilderung geht an die Moderation. Sie sieht sich die
          Entscheidung noch einmal an und antwortet dir mit einer Begründung.
        </p>

        <textarea
          id={fieldId}
          rows={6}
          value={message}
          maxLength={MAX_LENGTH}
          required
          disabled={pending}
          onChange={(event) => setMessage(event.target.value)}
          aria-describedby={counterId}
          className={cn(
            "focus-ring w-full resize-y rounded-lg border border-input bg-card p-4",
            "text-body text-card-foreground placeholder:text-muted-foreground",
            "transition-colors duration-fast hover:border-primary",
            "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
          )}
        />

        <p
          id={counterId}
          aria-live="polite"
          className="text-label tabular-nums text-muted-foreground"
        >
          {message.length} von {MAX_LENGTH} Zeichen
        </p>
      </div>

      {result && !result.ok ? (
        <NoticeBanner tone="warnung" title="Der Widerspruch wurde nicht gesendet">
          <p>{result.message}</p>
        </NoticeBanner>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          loading={pending}
          loadingLabel="Wird gesendet"
          className="whitespace-nowrap"
        >
          Widerspruch absenden
        </Button>

        <Button
          type="button"
          variant="tertiary"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
