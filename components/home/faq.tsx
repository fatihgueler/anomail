"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import * as React from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Fragen und Antworten.
 *
 * Bewusst mit Knoepfen und aria-expanded statt <details>: die Hoehe soll
 * weich aufgehen, und das kann <details> nicht. Die Tastaturbedienung kommt
 * dadurch nicht mehr vom Browser, also steht sie hier - Enter und Leertaste
 * bedienen einen <button> von sich aus, mehr braucht es nicht.
 *
 * Mehrere Eintraege duerfen gleichzeitig offen sein. Ein Akkordeon, das beim
 * Oeffnen einer Frage die vorige zuklappt, nimmt dem Lesenden den Vergleich.
 */

export type Frage = { frage: string; antwort: string };

export function Faq({ eintraege }: { eintraege: Frage[] }) {
  const [offen, setOffen] = React.useState<Set<number>>(new Set());
  const wenigerBewegung = useReducedMotion();

  const umschalten = (index: number) => {
    setOffen((vorher) => {
      const naechste = new Set(vorher);

      if (naechste.has(index)) {
        naechste.delete(index);
      } else {
        naechste.add(index);
      }

      return naechste;
    });
  };

  return (
    <ul className="flex flex-col">
      {eintraege.map((eintrag, index) => {
        const istOffen = offen.has(index);
        const bereichId = `faq-antwort-${index}`;

        return (
          <li key={eintrag.frage} className="border-b border-border">
            <h3>
              <button
                type="button"
                onClick={() => umschalten(index)}
                aria-expanded={istOffen}
                aria-controls={bereichId}
                className={cn(
                  "focus-ring hit-area flex w-full items-center justify-between gap-6 rounded-md py-4 text-left",
                  "font-serif text-subtitle text-foreground",
                  "transition-colors duration-fast ease-out hover:text-primary",
                  "motion-reduce:transition-none",
                )}
              >
                {eintrag.frage}

                <motion.span
                  aria-hidden="true"
                  className="shrink-0 text-accent"
                  animate={{ rotate: istOffen ? 45 : 0 }}
                  transition={{
                    duration: wenigerBewegung ? 0 : 0.25,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Icon icon={Plus} />
                </motion.span>
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {istOffen ? (
                <motion.div
                  id={bereichId}
                  key="antwort"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    duration: wenigerBewegung ? 0 : 0.25,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="overflow-hidden"
                >
                  <p className="max-w-prose pb-6 text-body text-muted-foreground">
                    {eintrag.antwort}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
