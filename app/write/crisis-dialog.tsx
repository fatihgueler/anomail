"use client";

import * as React from "react";

import { AppDialog } from "@/components/ui/dialog";

/**
 * Der Krisen-Dialog.
 *
 * Der wichtigste Text der Anwendung. Er ist deshalb voll kontrastiert gesetzt
 * und nicht im gedaempften Sekundaerton, und die Rufnummern sind auf
 * Mobilgeraeten waehlbar.
 *
 * Fokus-Trap, aria-modal, Escape und die Rueckgabe des Fokus an den Ausloeser
 * bringt die Dialog-Komponente aus AP1 mit.
 */

/** Wortlaut fest verdrahtet. Diese Texte sind vorgegeben und nicht variabel. */
const HEADLINE = "Dir gerade jetzt nicht gut?";

const BODY =
  "Anomail ist kein Notfall- oder professioneller Krisendienst. Bei unmittelbarer Gefahr oder akuten Krisen brauchst du professionelle Hilfe.";

const SUBHEADLINE = "Kostenlose Hilfe – rund um die Uhr:";

const HELPLINES = [
  { number: "112", dial: "112", label: "Notruf bei akuter Gefahr" },
  {
    number: "0800/1110111",
    dial: "08001110111",
    label: "Telefonseelsorge",
  },
  {
    number: "0800/1110222",
    dial: "08001110222",
    label: "Telefonseelsorge (alternativ)",
  },
] as const;

type CrisisDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
};

export function CrisisDialog({
  open,
  onOpenChange,
  returnFocusRef,
}: CrisisDialogProps) {
  return (
    <AppDialog
      variant="crisis"
      open={open}
      onOpenChange={onOpenChange}
      title={HEADLINE}
      description={BODY}
      dismissLabel="Verstanden"
      returnFocusRef={returnFocusRef}
    >
      <div className="flex flex-col gap-4">
        <h3 className="text-subtitle text-card-foreground">{SUBHEADLINE}</h3>

        <ul className="flex flex-col gap-3">
          {HELPLINES.map((line) => (
            <li key={line.number}>
              <a
                href={`tel:${line.dial}`}
                className="focus-ring hit-area -mx-3 flex items-center gap-3 rounded-lg px-3 text-body text-card-foreground transition-colors duration-fast hover:bg-secondary"
              >
                <span className="font-semibold tabular-nums">{line.number}</span>
                <span aria-hidden="true">–</span>
                <span>{line.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </AppDialog>
  );
}
