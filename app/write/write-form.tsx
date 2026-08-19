"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { CategoryChipGroup } from "@/components/ui/category-chip";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { Textarea } from "@/components/ui/textarea";

import { CrisisDialog } from "./crisis-dialog";
import { submitLetterAction } from "./actions";
import { WRITE_INITIAL_STATE, type WriteFormState } from "./form-state";

const MIN_LENGTH = 80;
const MAX_LENGTH = 4000;

/** Genau diese acht. Die Reihenfolge ist die der Vorgabe. */
const CATEGORIES = [
  { value: "beziehung", label: "Beziehung" },
  { value: "familie", label: "Familie" },
  { value: "einsamkeit", label: "Einsamkeit" },
  { value: "arbeit", label: "Arbeit" },
  { value: "schule", label: "Schule" },
  { value: "hoffnung", label: "Hoffnung" },
  { value: "persoenliches", label: "Persönliches" },
  { value: "sonstiges", label: "Sonstiges" },
];

type WriteFormProps = {
  /** Serverseitig je Aufruf der Seite vergeben. Bindet den Absendevorgang. */
  submissionId: string;
};

export function WriteForm({ submissionId }: WriteFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = React.useActionState<
    WriteFormState,
    FormData
  >(submitLetterAction, WRITE_INITIAL_STATE);

  const [content, setContent] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [crisisOpen, setCrisisOpen] = React.useState(false);
  const submitRef = React.useRef<HTMLButtonElement>(null);

  const sent = state.status === "sent";
  const needsCrisisNotice = sent && state.showCrisisNotice === true;

  React.useEffect(() => {
    if (!sent) {
      return;
    }

    if (state.showCrisisNotice) {
      setCrisisOpen(true);
      return;
    }

    router.push("/sent");
  }, [sent, state.showCrisisNotice, router]);

  const tooShort = content.trim().length > 0 && content.trim().length < MIN_LENGTH;
  const fehlende = MIN_LENGTH - content.trim().length;

  const statusText = pending
    ? "Dein Brief wird geprüft und abgeschickt."
    : state.status === "sent"
      ? "Dein Brief ist abgeschickt."
      : state.message
        ? state.message
        : "";

  return (
    <>
      <form action={formAction} className="flex max-w-prose flex-col gap-8">
        <input type="hidden" name="submissionId" value={submissionId} />

        <NoticeBanner tone="hinweis" title="Bitte keine persönlichen Daten">
          <p>
            Schreib keine Namen, Adressen, Telefonnummern oder andere Angaben,
            über die sich jemand identifizieren lässt. Das gilt für dich selbst
            und für alle, über die du schreibst.
          </p>
        </NoticeBanner>

        <Textarea
          name="content"
          label="Dein Brief"
          hint={`Mindestens ${MIN_LENGTH}, höchstens ${MAX_LENGTH} Zeichen. Nimm dir Zeit.`}
          maxLength={MAX_LENGTH}
          value={content}
          onValueChange={setContent}
          disabled={pending}
          rows={14}
          placeholder="Was beschäftigt dich?"
          error={
            state.status === "invalid" && state.field === "content"
              ? state.message
              : undefined
          }
        />

        {tooShort ? (
          <p className="-mt-6 text-small text-muted-foreground">
            Noch {fehlende} Zeichen bis zur Mindestlänge.
          </p>
        ) : null}

        <CategoryChipGroup
          legend="Worum geht es?"
          hint="Du kannst mehrere auswählen. Ohne Auswahl ordnen wir den Brief unter Sonstiges ein."
          options={CATEGORIES}
          selected={selected}
          onSelectedChange={setSelected}
          disabled={pending}
          error={
            state.status === "invalid" && state.field === "categories"
              ? state.message
              : undefined
          }
        />

        {/* Die Auswahl der Chips wandert als reguläre Formularwerte mit. */}
        {selected.map((slug) => (
          <input key={slug} type="hidden" name="categories" value={slug} />
        ))}

        {state.status === "rate-limited" || state.status === "failed" ? (
          <NoticeBanner tone="warnung" title="Der Brief wurde nicht abgeschickt">
            <p>{state.message}</p>
          </NoticeBanner>
        ) : null}

        {state.status === "invalid" && state.field === "submission" ? (
          <NoticeBanner tone="warnung" title="Das Formular ist abgelaufen">
            <p>{state.message}</p>
          </NoticeBanner>
        ) : null}

        {/* Der einzige Primär-Button der Seite. */}
        <div>
          <Button
            ref={submitRef}
            type="submit"
            variant="primary"
            iconLeft={Send}
            loading={pending}
            loadingLabel="Wird geprüft und abgeschickt"
            disabled={pending}
          >
            Brief abschicken
          </Button>
        </div>

        {/* Zustandsänderungen werden angesagt, nicht nur angezeigt. */}
        <p role="status" aria-live="polite" className="sr-only">
          {statusText}
        </p>
      </form>

      <CrisisDialog
        open={crisisOpen}
        onOpenChange={(open) => {
          setCrisisOpen(open);

          // Der Dialog ist keine Sackgasse: nach dem Schliessen geht es zur
          // Bestaetigung weiter, wie bei jedem anderen Brief auch.
          if (!open && needsCrisisNotice) {
            router.push("/sent");
          }
        }}
        returnFocusRef={submitRef}
      />
    </>
  );
}
