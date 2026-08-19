"use client";

import { ReportButton } from "@/components/report/report-action";
import { reportAction } from "@/lib/actions/moderation-actions";
import { REPORT_REASONS } from "@/lib/actions/report-reasons";

/**
 * Melden-Ausloeser am zugewiesenen Brief.
 *
 * Duenner Client-Wrapper, weil die Seite eine Server Component ist. Der eigene
 * Brief kann hier nicht auftauchen: assign_letter() weist niemandem den eigenen
 * Brief zu, und die Serveraktion weist ihn zusaetzlich ab.
 */
export function ReportLetterButton({ letterId }: { letterId: string }) {
  return (
    <ReportButton
      reasons={REPORT_REASONS}
      subject="Brief"
      label="Brief melden"
      onReport={(reason, note) =>
        reportAction("letter", letterId, reason, note)
      }
    />
  );
}
