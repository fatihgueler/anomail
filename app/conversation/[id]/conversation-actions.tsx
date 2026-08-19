"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { DangerAction } from "@/components/conversation/danger-action";
import { ReportButton } from "@/components/report/report-action";
import { blockAction, reportAction } from "@/lib/actions/moderation-actions";
import { REPORT_REASONS } from "@/lib/actions/report-reasons";

/**
 * Melden und Blockieren im Briefwechsel.
 *
 * Duenne Client-Wrapper: die Seite ist eine Server Component und kann keine
 * Funktion als Prop weiterreichen, deshalb wandern nur die Kennungen hierher.
 */

export function ReportConversationButton({
  conversationId,
}: {
  conversationId: string;
}) {
  return (
    <ReportButton
      reasons={REPORT_REASONS}
      subject="Briefwechsel"
      label="Briefwechsel melden"
      onReport={(reason, note) =>
        reportAction("conversation", conversationId, reason, note)
      }
    />
  );
}

export function BlockPartnerButton({
  partnerId,
  partnerAnomailId,
}: {
  partnerId: string;
  partnerAnomailId: string;
}) {
  const router = useRouter();
  const [, startTransition] = React.useTransition();

  return (
    <DangerAction
      label="Person blockieren"
      confirmTitle={`${partnerAnomailId} blockieren?`}
      confirmDescription="Ihr könnt einander danach nicht mehr schreiben, und ihr bekommt keine Briefe mehr voneinander zugeteilt. Der bisherige Verlauf bleibt für euch beide lesbar. Du kannst die Blockierung unter Blockierte Personen wieder aufheben."
      confirmLabel="Ja, blockieren"
      action={async () => {
        const failure = await blockAction(partnerId);

        if (!failure) {
          startTransition(() => router.refresh());
        }

        return failure;
      }}
    />
  );
}
