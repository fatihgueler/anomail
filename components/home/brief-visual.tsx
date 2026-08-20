"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import * as React from "react";

/**
 * Das Blatt im Hero.
 *
 * Ein Blatt Papier, dessen obere Haelfte sich beim Scrollen entlang der Falz
 * nach hinten legt. Dieselbe Falz, die im ganzen System die Abschnitte trennt,
 * und dieselbe Bewegung, die beim Absenden eines Briefs laeuft - die
 * Startseite zeigt also vorweg, was das Produkt tut.
 *
 * Rein zierend: der Text daneben sagt dasselbe. Deshalb aria-hidden.
 */
export function BriefVisual() {
  const wenigerBewegung = useReducedMotion();
  const bereich = React.useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: bereich,
    offset: ["start center", "end start"],
  });

  // Der Hook laeuft immer - Hooks duerfen nicht bedingt aufgerufen werden.
  // Ob sein Ergebnis verwendet wird, entscheidet sich weiter unten.
  const gedrehteAchse = useTransform(scrollYProgress, [0, 1], [0, -62]);

  return (
    <div
      ref={bereich}
      aria-hidden="true"
      className="relative mx-auto w-full max-w-[22rem] select-none"
      style={{ perspective: "1200px" }}
    >
      <div className="relative aspect-[3/4] w-full rounded-md border border-border bg-card shadow-paper-3">
        {/* Untere Haelfte: bleibt liegen */}
        <div className="absolute inset-x-0 bottom-0 top-1/2 flex flex-col gap-3 px-8 pt-8">
          <Zeile breite="88%" />
          <Zeile breite="94%" />
          <Zeile breite="76%" />
          <Zeile breite="90%" />
          <Zeile breite="42%" />
        </div>

        {/* Obere Haelfte: klappt entlang der Falz nach hinten */}
        <motion.div
          className="absolute inset-x-0 top-0 h-1/2 origin-bottom rounded-t-md border-b border-border bg-card"
          style={
            wenigerBewegung
              ? undefined
              : { rotateX: gedrehteAchse, transformStyle: "preserve-3d" }
          }
        >
          {/* Ein Brief faengt oben an zu schreiben, nicht an der Falz. */}
          <div className="flex h-full flex-col gap-3 px-8 pt-8">
            <Zeile breite="44%" ton="kraeftig" />
            <span className="block h-2" />
            <Zeile breite="92%" />
            <Zeile breite="86%" />
            <Zeile breite="94%" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** Eine angedeutete Textzeile. */
function Zeile({
  breite,
  ton = "normal",
}: {
  breite: string;
  ton?: "normal" | "kraeftig";
}) {
  return (
    <span
      className={
        ton === "kraeftig"
          ? "block h-2 rounded-full bg-primary/30"
          : "block h-1 rounded-full bg-foreground/15"
      }
      style={{ width: breite }}
    />
  );
}
