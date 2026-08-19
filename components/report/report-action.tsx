"use client";

import { Flag } from "lucide-react";
import * as React from "react";

import { MessageMenuItem } from "@/components/conversation/message-menu";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { NoticeBanner } from "@/components/ui/notice-banner";

import { ReportDialog, type ReportReasonOption } from "./report-dialog";

/**
 * Melden-Ausloeser in zwei Ausfuehrungen: als Eintrag im Nachrichten-Menue aus
 * AP6 und als eigenstaendiger Tertiaer-Knopf.
 *
 * Beide teilen sich Dialog, Zustandsanzeige und Ergebnis, damit es nur eine
 * Stelle gibt, an der das Melden stattfindet.
 */

export type ReportOutcome = {
  status: "created" | "duplicate" | "not-allowed" | "invalid" | "rate-limited" | "failed";
  message: string;
};

type SharedProps = {
  reasons: readonly ReportReasonOption[];
  subject: string;
  onReport: (reason: string, note: string) => Promise<ReportOutcome>;
};

function useReporting(onReport: SharedProps["onReport"]) {
  const [open, setOpen] = React.useState(false);
  const [outcome, setOutcome] = React.useState<ReportOutcome | undefined>();
  const [pending, startTransition] = React.useTransition();

  const submit = React.useCallback(
    (reason: string, note: string) => {
      setOutcome(undefined);
      startTransition(async () => {
        setOutcome(await onReport(reason, note));
      });
    },
    [onReport],
  );

  return { open, setOpen, outcome, pending, submit };
}

/** Sichtbare Rueckmeldung nach dem Absenden. */
function Outcome({ outcome }: { outcome: ReportOutcome | undefined }) {
  if (!outcome) {
    return null;
  }

  const tone = outcome.status === "created" || outcome.status === "duplicate"
    ? "hinweis"
    : "warnung";

  return (
    <div className="mt-3 max-w-prose">
      <NoticeBanner
        tone={tone}
        title={
          outcome.status === "created"
            ? "Deine Meldung ist eingegangen"
            : outcome.status === "duplicate"
              ? "Diese Meldung liegt bereits vor"
              : "Die Meldung wurde nicht abgeschickt"
        }
      >
        <p>{outcome.message}</p>
      </NoticeBanner>
    </div>
  );
}

/** Eintrag fuer das Nachrichten-Menue aus AP6. */
export function ReportMenuItem({ reasons, subject, onReport }: SharedProps) {
  const { open, setOpen, submit } = useReporting(onReport);

  return (
    <>
      <MessageMenuItem onSelect={() => setOpen(true)}>
        <Icon icon={Flag} />
        Melden
      </MessageMenuItem>

      <ReportDialog
        open={open}
        onOpenChange={setOpen}
        reasons={reasons}
        subject={subject}
        onSubmit={submit}
      />
    </>
  );
}

/** Eigenstaendiger Ausloeser, etwa unter einem Brief oder einem Briefwechsel. */
export function ReportButton({
  reasons,
  subject,
  label,
  onReport,
}: SharedProps & { label: string }) {
  const { open, setOpen, outcome, pending, submit } = useReporting(onReport);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <div>
      <Button
        ref={triggerRef}
        variant="tertiary"
        iconLeft={Flag}
        loading={pending}
        loadingLabel="Wird gemeldet"
        className="whitespace-nowrap"
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>

      <p role="status" aria-live="polite" className="sr-only">
        {outcome?.message ?? ""}
      </p>

      <Outcome outcome={outcome} />

      <ReportDialog
        open={open}
        onOpenChange={setOpen}
        reasons={reasons}
        subject={subject}
        onSubmit={submit}
        returnFocusRef={triggerRef}
      />
    </div>
  );
}
