"use client";

import * as React from "react";

import { Reveal } from "@/components/ui/reveal";

/**
 * Die drei Zustaende eines Briefs.
 *
 * Keine erfundene Nummerierung: "Wartet", "Zugeteilt" und "Beantwortet" sind
 * die Zustaende, die ein Brief in der Datenbank tatsaechlich durchlaeuft. Wer
 * das hier liest und spaeter unter "Meine Briefe" dieselben Woerter findet,
 * hat dieselbe Sache zweimal gesehen.
 *
 * Die verbindende Linie laeuft beim Hereinscrollen ein - sie zeigt die
 * Richtung, in die es geht. Wie bei allen Einblendungen gilt: ohne JavaScript
 * steht sie einfach da, statt unsichtbar zu bleiben.
 */

const SCHRITTE = [
  {
    zustand: "Wartet",
    text: "Du schreibst, was dich belastet, und schickst es ab. Der Brief liegt bereit, ohne dass jemand weiß, dass er von dir ist.",
  },
  {
    zustand: "Zugeteilt",
    text: "Genau ein Mensch bekommt ihn. Nicht viele, nicht ein Feed. Einer, der Zeit hat zu lesen.",
  },
  {
    zustand: "Beantwortet",
    text: "Die Antwort landet bei dir. Wenn ihr wollt, wird ein Gespräch daraus. Wenn nicht, bleibt es bei diesem einen Austausch.",
  },
];

export function Ablauf() {
  const linie = React.useRef<HTMLSpanElement>(null);
  const [gezogen, setGezogen] = React.useState(false);

  React.useEffect(() => {
    const knoten = linie.current;

    if (!knoten || typeof IntersectionObserver === "undefined") {
      setGezogen(true);
      return;
    }

    const beobachter = new IntersectionObserver(
      (eintraege) => {
        for (const eintrag of eintraege) {
          if (eintrag.isIntersecting) {
            setGezogen(true);
            beobachter.disconnect();
          }
        }
      },
      { rootMargin: "-80px" },
    );

    beobachter.observe(knoten);

    return () => beobachter.disconnect();
  }, []);

  return (
    <ol className="relative grid gap-10 sm:grid-cols-3 sm:gap-8">
      {/* Nur auf breiten Schirmen, wo die Schritte nebeneinanderstehen.
          Untereinander zeigte eine waagerechte Linie in die falsche Richtung. */}
      <span
        ref={linie}
        aria-hidden="true"
        data-linie={gezogen ? "gezogen" : "wartet"}
        className="absolute left-0 top-2 hidden h-px w-full origin-left bg-border sm:block"
      />

      {SCHRITTE.map((schritt, index) => (
        <Reveal
          als="li"
          key={schritt.zustand}
          verzoegerung={150 + index * 120}
          className="relative flex flex-col gap-3 sm:pt-8"
        >
          {/* Der Punkt sitzt auf der Linie. */}
          <span
            aria-hidden="true"
            className="absolute left-0 top-0 hidden h-4 w-4 -translate-y-2 rounded-full border-2 border-background bg-accent sm:block"
          />

          <span className="font-sans text-label uppercase tracking-[0.14em] text-accent">
            {schritt.zustand}
          </span>

          <p className="max-w-prose text-body text-muted-foreground">
            {schritt.text}
          </p>
        </Reveal>
      ))}
    </ol>
  );
}
