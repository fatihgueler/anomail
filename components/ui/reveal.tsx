"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Einblenden beim Hereinscrollen - bewusst ohne framer-motion.
 *
 * Der Grund ist kein Geschmack, sondern ein Fehler, der sonst entsteht:
 * framer-motion schreibt den Startzustand einer motion-Komponente als Inline-
 * Stil schon in das servergerenderte HTML. Bei initial={{ opacity: 0 }} kommt
 * die Seite also mit unsichtbarem Inhalt an, und wer kein JavaScript
 * ausfuehrt, sieht dauerhaft nichts. Bei einem Dienst, dessen Formulare dank
 * Server Actions auch ohne JavaScript funktionieren, waere das ein
 * Rueckschritt.
 *
 * Deshalb umgekehrt: sichtbar ist der Ausgangszustand. Erst das Skript im
 * <head> setzt die Klasse "js" auf <html>, und erst dann versteckt die CSS-
 * Regel den Inhalt wieder, damit er eingeblendet werden kann. Ohne JavaScript
 * greift die Regel nie und alles steht da.
 *
 * framer-motion bleibt dort im Einsatz, wo es etwas kann, das CSS nicht kann:
 * die Hoehenanimation im FAQ und die Faltung des Briefs.
 */
export function Reveal({
  children,
  className,
  /** Verzoegerung in Millisekunden, fuer gestaffelte Gruppen. */
  verzoegerung = 0,
  /**
   * Das erzeugte Element. In einer Liste muss die Huelle selbst das <li>
   * sein - ein <div> zwischen <ol> und <li> waere ungueltig, und axe meldet
   * es zu Recht.
   */
  als: Als = "div",
}: {
  children: React.ReactNode;
  className?: string;
  verzoegerung?: number;
  als?: "div" | "li";
}) {
  const element = React.useRef<HTMLElement>(null);
  const [sichtbar, setSichtbar] = React.useState(false);

  React.useEffect(() => {
    const knoten = element.current;

    if (!knoten) {
      return;
    }

    // Kein IntersectionObserver: dann sofort zeigen, nicht nie.
    if (typeof IntersectionObserver === "undefined") {
      setSichtbar(true);
      return;
    }

    const beobachter = new IntersectionObserver(
      (eintraege) => {
        for (const eintrag of eintraege) {
          if (eintrag.isIntersecting) {
            setSichtbar(true);
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
    <Als
      ref={element as React.Ref<HTMLDivElement & HTMLLIElement>}
      data-reveal={sichtbar ? "sichtbar" : "wartet"}
      style={verzoegerung ? { transitionDelay: `${verzoegerung}ms` } : undefined}
      className={cn(className)}
    >
      {children}
    </Als>
  );
}

/**
 * Gestaffeltes Einblenden beim Laden, nicht beim Scrollen.
 *
 * Fuer den Hero: der laeuft, bevor jemand scrollt. Dieselbe Absicherung -
 * ohne JavaScript steht der Inhalt einfach da.
 */
export function Einlauf({
  children,
  className,
  /** Verzoegerung in Millisekunden. */
  verzoegerung = 0,
}: {
  children: React.ReactNode;
  className?: string;
  verzoegerung?: number;
}) {
  const [sichtbar, setSichtbar] = React.useState(false);

  React.useEffect(() => {
    // Ein Bildwechsel spaeter, damit der Uebergang wirklich laeuft und nicht
    // im selben Zug mit dem Startzustand zusammenfaellt.
    const id = requestAnimationFrame(() => setSichtbar(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      data-reveal={sichtbar ? "sichtbar" : "wartet"}
      style={verzoegerung ? { transitionDelay: `${verzoegerung}ms` } : undefined}
      className={cn(className)}
    >
      {children}
    </div>
  );
}
