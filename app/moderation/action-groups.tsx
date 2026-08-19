"use client";

import { ActionDialog } from "@/components/moderation/action-dialog";
import {
  banUserAction,
  hideContentAction,
  resolveReportAction,
  reviewAppealAction,
  unbanUserAction,
  unhideContentAction,
  updateSafetyCheckAction,
} from "@/lib/actions/moderation-server-actions";

/**
 * Duenne Client-Wrapper um die Server Actions.
 *
 * Die Seiten sind Server Components und koennen keine Funktion als Prop
 * weitergeben, deshalb wandern nur Kennungen hierher.
 *
 * Es gibt hier bewusst keinen Weg, eine Person zu kontaktieren. Ein
 * Direktkontakt zwischen Moderation und Nutzer wuerde eine Betreuung
 * versprechen, die der Dienst nicht leisten kann und rechtlich nicht leisten
 * darf.
 */

type TargetType = "letter" | "message" | "conversation";

export function HideAction({
  targetType,
  targetId,
}: {
  targetType: TargetType;
  targetId: string;
}) {
  const noun =
    targetType === "letter"
      ? "Brief"
      : targetType === "message"
        ? "Nachricht"
        : "Briefwechsel";

  return (
    <ActionDialog
      label={targetType === "conversation" ? "Briefwechsel schließen" : "Ausblenden"}
      title={`${noun} ausblenden?`}
      description={
        targetType === "conversation"
          ? "Der Briefwechsel wird archiviert. Beide sehen den Verlauf weiter, niemand kann hineinschreiben. Es wird nichts gelöscht."
          : `Der Inhalt ist danach für andere nicht mehr sichtbar. Er wird nicht gelöscht — die verfassende Person sieht ihn weiterhin samt deiner Begründung.`
      }
      confirmLabel="Ja, ausblenden"
      action={(reason) => hideContentAction(targetType, targetId, reason)}
    />
  );
}

export function UnhideAction({
  targetType,
  targetId,
}: {
  targetType: TargetType;
  targetId: string;
}) {
  return (
    <ActionDialog
      variant="secondary"
      label="Ausblendung aufheben"
      title="Ausblendung aufheben?"
      description="Der Inhalt wird wieder sichtbar. Ein wartender Brief geht zurück in die Zuweisung."
      confirmLabel="Ja, wieder sichtbar machen"
      action={(reason) => unhideContentAction(targetType, targetId, reason)}
    />
  );
}

export function BanAction({
  userId,
  anomailId,
}: {
  userId: string;
  anomailId: string;
}) {
  return (
    <ActionDialog
      label="Konto sperren"
      title={`Konto ${anomailId} sperren?`}
      description="Die Sperre wirkt sofort. Die Person kann den Dienst danach nicht mehr nutzen. Sie sieht deine Begründung und kann Widerspruch einlegen."
      confirmLabel="Ja, Konto sperren"
      requiresSecondConfirmation
      secondConfirmationLabel="Mir ist bewusst, dass diese Person den Dienst in einer belastenden Situation nutzt und ihn danach nicht mehr erreichen kann."
      action={(reason) => banUserAction(userId, reason)}
    />
  );
}

export function UnbanAction({
  userId,
  anomailId,
}: {
  userId: string;
  anomailId: string;
}) {
  return (
    <ActionDialog
      variant="secondary"
      label="Sperre aufheben"
      title={`Sperre für ${anomailId} aufheben?`}
      description="Die Person kann den Dienst danach wieder nutzen."
      confirmLabel="Ja, Sperre aufheben"
      action={(reason) => unbanUserAction(userId, reason)}
    />
  );
}

export function ResolveReportAction({ reportId }: { reportId: string }) {
  return (
    <ActionDialog
      variant="secondary"
      label="Meldung abschließen"
      title="Meldung abschließen?"
      description="Die Begründung wird der meldenden Person unter Meine Meldungen angezeigt."
      confirmLabel="Ja, abschließen"
      action={(note) => resolveReportAction(reportId, note)}
    />
  );
}

export function SafetyCheckAction({
  checkId,
  status,
  label,
  title,
  description,
}: {
  checkId: string;
  status: "reviewing" | "resolved" | "dismissed";
  label: string;
  title: string;
  description: string;
}) {
  return (
    <ActionDialog
      variant="secondary"
      label={label}
      title={title}
      description={description}
      confirmLabel="Ja, eintragen"
      action={(note) => updateSafetyCheckAction(checkId, status, note)}
    />
  );
}

export function AppealDecisionAction({
  appealId,
  decision,
}: {
  appealId: string;
  decision: "upheld" | "rejected";
}) {
  return (
    <ActionDialog
      variant="secondary"
      label={decision === "upheld" ? "Widerspruch stattgeben" : "Widerspruch ablehnen"}
      title={
        decision === "upheld"
          ? "Dem Widerspruch stattgeben?"
          : "Den Widerspruch ablehnen?"
      }
      description="Deine Begründung wird der widersprechenden Person angezeigt. Die Entscheidung über den Inhalt selbst triffst du getrennt davon."
      confirmLabel="Ja, eintragen"
      action={(note) => reviewAppealAction(appealId, decision, note)}
    />
  );
}
