"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { CrisisDialog } from "@/app/write/crisis-dialog";
import { Button } from "@/components/ui/button";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { Textarea } from "@/components/ui/textarea";

import { releaseAssignmentAction, submitReplyAction } from "./actions";
import { REPLY_INITIAL_STATE, type ReplyFormState } from "./form-state";

const MIN_LENGTH = 80;
const MAX_LENGTH = 4000;

type ReplyFormProps = {
  letterId: string;
};

export function ReplyForm({ letterId }: ReplyFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = React.useActionState<
    ReplyFormState,
    FormData
  >(submitReplyAction, REPLY_INITIAL_STATE);

  const [content, setContent] = React.useState("");
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

    router.push("/response-sent");
  }, [sent, state.showCrisisNotice, router]);

  const trimmed = content.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_LENGTH;

  const statusText = pending
    ? "Deine Antwort wird geprüft und abgeschickt."
    : sent
      ? "Deine Antwort ist abgeschickt."
      : (state.message ?? "");

  return (
    <>
      <form action={formAction} className="flex max-w-prose flex-col gap-6">
        <input type="hidden" name="letterId" value={letterId} />

        <NoticeBanner tone="hinweis" title="Was diese Antwort ist und was nicht">
          <p>
            Anomail ersetzt keine professionelle Beratung, keine Therapie und
            keine ärztliche Hilfe. Deine Antwort kommt von einem Menschen, nicht
            von Fachpersonal. Schreib, was du ehrlich sagen kannst, und rate
            niemandem, was du nicht beurteilen kannst.
          </p>
        </NoticeBanner>

        <Textarea
          name="content"
          label="Deine Antwort"
          hint={`Mindestens ${MIN_LENGTH}, höchstens ${MAX_LENGTH} Zeichen. Lass dir Zeit.`}
          maxLength={MAX_LENGTH}
          value={content}
          onValueChange={setContent}
          disabled={pending}
          rows={12}
          placeholder="Was möchtest du dieser Person schreiben?"
          error={state.status === "invalid" ? state.message : undefined}
        />

        {tooShort ? (
          <p className="-mt-4 text-small text-muted-foreground">
            Noch {MIN_LENGTH - trimmed.length} Zeichen bis zur Mindestlänge.
          </p>
        ) : null}

        {state.status === "not-assigned" ||
        state.status === "rate-limited" ||
        state.status === "failed" ? (
          <NoticeBanner tone="warnung" title="Die Antwort wurde nicht gesendet">
            <p>{state.message}</p>
          </NoticeBanner>
        ) : null}

        {/* Der einzige Primär-Button der Seite. */}
        <div className="flex flex-wrap items-center gap-4">
          <Button
            ref={submitRef}
            type="submit"
            variant="primary"
            iconLeft={Send}
            loading={pending}
            loadingLabel="Wird geprüft und abgeschickt"
            disabled={pending}
          >
            Antwort senden
          </Button>
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {statusText}
        </p>
      </form>

      {/*
        Eigenes Formular, damit das Freigeben nicht als zweiter Knopf im
        Antwortformular haengt und versehentlich mit abgeschickt wird.
      */}
      <form action={releaseAssignmentAction} className="max-w-prose">
        <input type="hidden" name="letterId" value={letterId} />
        <Button type="submit" variant="tertiary" disabled={pending}>
          Diesen Brief nicht beantworten
        </Button>
      </form>

      <CrisisDialog
        open={crisisOpen}
        onOpenChange={(open) => {
          setCrisisOpen(open);

          if (!open && needsCrisisNotice) {
            router.push("/response-sent");
          }
        }}
        returnFocusRef={submitRef}
      />
    </>
  );
}
