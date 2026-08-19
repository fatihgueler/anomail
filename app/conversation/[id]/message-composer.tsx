"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { CrisisDialog } from "@/app/write/crisis-dialog";
import { Button } from "@/components/ui/button";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { Textarea } from "@/components/ui/textarea";

import { postMessageAction } from "./actions";
import {
  COMPOSER_INITIAL_STATE,
  type ComposerState,
} from "./composer-state";

const MAX_LENGTH = 4000;

type MessageComposerProps = {
  conversationId: string;
};

export function MessageComposer({ conversationId }: MessageComposerProps) {
  const router = useRouter();
  const [state, formAction, pending] = React.useActionState<
    ComposerState,
    FormData
  >(postMessageAction, COMPOSER_INITIAL_STATE);

  const [content, setContent] = React.useState("");
  const [crisisOpen, setCrisisOpen] = React.useState(false);
  const submitRef = React.useRef<HTMLButtonElement>(null);

  const sent = state.status === "sent";

  React.useEffect(() => {
    if (!sent) {
      return;
    }

    setContent("");

    if (state.showCrisisNotice) {
      setCrisisOpen(true);
      return;
    }

    router.refresh();
  }, [sent, state.showCrisisNotice, router]);

  const statusText = pending
    ? "Deine Nachricht wird geprüft und abgeschickt."
    : sent
      ? "Deine Nachricht ist abgeschickt."
      : (state.message ?? "");

  return (
    <>
      <form action={formAction} className="flex max-w-prose flex-col gap-4">
        <input type="hidden" name="conversationId" value={conversationId} />

        <Textarea
          name="content"
          label="Deine Nachricht"
          hint={`Höchstens ${MAX_LENGTH} Zeichen.`}
          maxLength={MAX_LENGTH}
          value={content}
          onValueChange={setContent}
          disabled={pending}
          rows={6}
          placeholder="Was möchtest du schreiben?"
          error={state.status === "invalid" ? state.message : undefined}
        />

        {state.status === "not-allowed" ||
        state.status === "archived" ||
        state.status === "rate-limited" ||
        state.status === "failed" ? (
          <NoticeBanner tone="warnung" title="Die Nachricht wurde nicht gesendet">
            <p>{state.message}</p>
          </NoticeBanner>
        ) : null}

        <div>
          <Button
            ref={submitRef}
            type="submit"
            variant="primary"
            iconLeft={Send}
            loading={pending}
            loadingLabel="Wird geprüft und abgeschickt"
            disabled={pending}
            className="whitespace-nowrap"
          >
            Nachricht senden
          </Button>
        </div>

        {/* Neue Nachrichten und Zustandswechsel werden angesagt. */}
        <p role="status" aria-live="polite" className="sr-only">
          {statusText}
        </p>
      </form>

      <CrisisDialog
        open={crisisOpen}
        onOpenChange={(open) => {
          setCrisisOpen(open);

          if (!open) {
            router.refresh();
          }
        }}
        returnFocusRef={submitRef}
      />
    </>
  );
}
