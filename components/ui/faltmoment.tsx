"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import * as React from "react";

/**
 * Der Faltmoment.
 *
 * Wenn ein Brief abgeschickt ist, faltet sich ein Blatt entlang seiner Falz
 * und gleitet weg. Das ist der einzige Moment in der Anwendung, der laenger
 * dauern darf als ein Uebergang - 800 Millisekunden - und der einzige, der
 * nichts erklaert, sondern etwas bestaetigt.
 *
 * Er haelt nichts auf: die Weiterleitung laeuft danach von selbst weiter, und
 * wer prefers-reduced-motion gesetzt hat, ueberspringt ihn ganz. Fuer
 * Screenreader steht die Aussage ohnehin im role="status" des Formulars -
 * hier ist bewusst nichts vorlesbar, sonst gaebe es sie doppelt.
 */
export function Faltmoment({
  offen,
  /** Laeuft, wenn die Faltung durch ist. Auch bei uebersprungener Bewegung. */
  fertig,
}: {
  offen: boolean;
  fertig: () => void;
}) {
  const wenigerBewegung = useReducedMotion();
  const abgeschlossen = React.useRef(false);

  React.useEffect(() => {
    if (!offen) {
      abgeschlossen.current = false;
      return;
    }

    if (abgeschlossen.current) {
      return;
    }

    /*
     * Der Abschluss haengt an einem Zeitgeber, nicht am Ende der Animation.
     * Ein onAnimationComplete, das nie ausloest - weil der Reiter im
     * Hintergrund liegt oder die Bewegung uebersprungen wird - wuerde den
     * Nutzer auf dieser Seite festhalten.
     */
    const dauer = wenigerBewegung ? 0 : 900;
    const id = setTimeout(() => {
      abgeschlossen.current = true;
      fertig();
    }, dauer);

    return () => clearTimeout(id);
  }, [offen, wenigerBewegung, fertig]);

  return (
    <AnimatePresence>
      {offen && !wenigerBewegung ? (
        <motion.div
          aria-hidden="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="relative h-64 w-48"
            style={{ perspective: "1000px" }}
          >
            {/* Untere Haelfte: bleibt stehen, gleitet am Ende mit weg. */}
            <motion.div
              className="absolute inset-x-0 bottom-0 top-1/2 rounded-b-md border border-t-0 border-border bg-card shadow-paper-3"
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: [0, 0, -420], opacity: [1, 1, 0] }}
              transition={{
                duration: 0.8,
                times: [0, 0.55, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
            />

            {/* Obere Haelfte: klappt entlang der Falz nach unten. */}
            <motion.div
              className="absolute inset-x-0 top-0 h-1/2 origin-bottom rounded-t-md border border-b-0 border-border bg-card shadow-paper-2"
              style={{ transformStyle: "preserve-3d" }}
              initial={{ rotateX: 0, y: 0, opacity: 1 }}
              animate={{ rotateX: [0, -175, -175], y: [0, 0, -420], opacity: [1, 1, 0] }}
              transition={{
                duration: 0.8,
                times: [0, 0.55, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
