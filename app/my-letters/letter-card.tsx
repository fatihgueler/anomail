"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { AppealForm } from "@/components/appeal/appeal-form";
import { DangerAction } from "@/components/conversation/danger-action";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { StatusBadge, type BriefStatus } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import { deleteLetterAction } from "./actions";

type LetterCardProps = {
  id: string;
  excerpt: string;
  createdAtLabel: string;
  status: BriefStatus;
  isHidden: boolean;
  hiddenReason: string | null;
  isDeleted: boolean;
  categories: Array<{ slug: string; label: string }>;
  conversationId: string | null;
};

export function LetterCard({
  id,
  excerpt,
  createdAtLabel,
  status,
  isHidden,
  hiddenReason,
  isDeleted,
  categories,
  conversationId,
}: LetterCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={status} />
          <time className="text-label text-muted-foreground">
            {createdAtLabel}
          </time>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {isDeleted ? (
          <p className="max-w-prose text-body italic text-muted-foreground">
            Diesen Brief hast du gelöscht.
          </p>
        ) : (
          <p className="max-w-prose whitespace-pre-wrap text-body text-card-foreground">
            {excerpt}
          </p>
        )}

        {isHidden ? (
          <div className="flex max-w-prose flex-col gap-3">
            <p className="text-small text-muted-foreground">
              Dieser Brief wird gerade geprüft und ist deshalb noch nicht
              unterwegs. Sobald die Prüfung abgeschlossen ist, geht es weiter.
            </p>

            {/* Begruendung der Moderation nach DSA Art. 17. */}
            {hiddenReason ? (
              <p className="text-small text-foreground">
                <span className="font-semibold">Begründung: </span>
                {hiddenReason}
              </p>
            ) : null}

            {/* Beschwerdeweg nach DSA Art. 20. */}
            <AppealForm targetType="letter" targetId={id} />
          </div>
        ) : null}

        {categories.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <li
                key={category.slug}
                className="rounded-full border border-input bg-secondary px-3 py-1 text-label text-secondary-foreground"
              >
                {category.label}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>

      <CardFooter className="flex-col items-start gap-4">
        {/*
          Genau eine Hauptaktion, und nur dann, wenn es den Briefwechsel
          wirklich gibt. Im Altsystem stand "Gespräch öffnen" auch an einem
          Brief, der noch auf eine Antwort wartete.
        */}
        {conversationId ? (
          <Link
            href={`/conversation/${conversationId}`}
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "whitespace-nowrap",
            )}
          >
            <Icon icon={MessageSquare} />
            Gespräch öffnen
          </Link>
        ) : null}

        {/* Nebenweg, sichtbar abgesetzt statt gleichrangig danebengestellt. */}
        {isDeleted ? null : (
          <div className="w-full border-t border-border pt-3">
            <DangerAction
              label="Brief löschen"
              confirmTitle="Diesen Brief löschen?"
              confirmDescription={
                conversationId
                  ? "Der Brieftext wird entfernt und lässt sich nicht wiederherstellen. Der Briefwechsel bleibt bestehen, damit der Verlauf für die andere Person nicht abbricht."
                  : "Der Brieftext wird entfernt und lässt sich nicht wiederherstellen. Der Brief wird niemandem mehr zum Beantworten zugeteilt."
              }
              confirmLabel="Ja, Brief löschen"
              action={() => deleteLetterAction(id)}
            />
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
