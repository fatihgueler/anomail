"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Wortmarke } from "@/components/brand/wortmarke";
import { cn } from "@/lib/utils";

/**
 * Kopfleiste.
 *
 * Bis hierher hatte die Anwendung keine seitenuebergreifende Navigation: von
 * /my-letters fuehrte kein Weg irgendwohin ausser ueber den Zurueck-Knopf.
 * Das war der auffaelligste Mangel aus dem Barrierefreiheitsbericht
 * (WCAG 2.4.5, Stufe AA) und ist damit behoben.
 *
 * Der Rand erscheint erst beim Scrollen. Solange die Seite oben steht, soll
 * die Leiste nicht als Kasten ueber dem Inhalt liegen, sondern Teil des
 * Blattes sein.
 */

type Ziel = { href: string; text: string };

const ANGEMELDET: Ziel[] = [
  { href: "/write", text: "Schreiben" },
  { href: "/listen", text: "Zuhören" },
  { href: "/my-letters", text: "Meine Briefe" },
];

const ABGEMELDET: Ziel[] = [{ href: "/help", text: "Hilfe" }];

export function Header({ angemeldet }: { angemeldet: boolean }) {
  const pfad = usePathname();
  const [gescrollt, setGescrollt] = React.useState(false);

  React.useEffect(() => {
    const beiScroll = () => setGescrollt(window.scrollY > 8);

    beiScroll();
    window.addEventListener("scroll", beiScroll, { passive: true });
    return () => window.removeEventListener("scroll", beiScroll);
  }, []);

  const ziele = angemeldet ? ANGEMELDET : ABGEMELDET;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full",
        "bg-background/85 backdrop-blur",
        "transition-[border-color,box-shadow] duration-base ease-out",
        gescrollt ? "border-b border-border shadow-paper-1" : "border-b border-transparent",
        "motion-reduce:transition-none",
      )}
    >
      {/*
        Zwei Zeilen auf schmalen Schirmen, eine ab sm.
        Alles in eine Zeile zu zwingen ergab auf 390px vier gequetschte Spalten
        mit umgebrochenen Woertern. Die Navigation ganz auszublenden waere die
        schlechtere Loesung gewesen - dann haetten Mobilnutzer wieder keinen
        Weg zwischen den Bereichen.
      */}
      <div className="mx-auto w-full max-w-shell px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
          <Link
            href="/"
            className="focus-ring hit-area -mx-2 inline-flex items-center rounded-md px-2 text-foreground"
          >
            <Wortmarke zeichenKlasse="text-primary" />
            <span className="sr-only">Zur Startseite</span>
          </Link>

          <nav aria-label="Hauptbereiche" className="order-3 w-full sm:order-2 sm:w-auto">
            <ul className="-mx-2 flex items-center gap-1 sm:mx-0 sm:gap-2">
              {ziele.map((ziel) => {
                const aktiv = pfad === ziel.href;

                return (
                  <li key={ziel.href}>
                    <Link
                      href={ziel.href}
                      aria-current={aktiv ? "page" : undefined}
                      className={cn(
                        "focus-ring hit-area inline-flex items-center whitespace-nowrap rounded-md px-3 text-small font-semibold",
                        "transition-colors duration-fast ease-out motion-reduce:transition-none",
                        aktiv
                          ? "text-primary underline decoration-2 underline-offset-8"
                          : "text-foreground hover:text-primary",
                      )}
                    >
                      {ziel.text}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <Link
            href={angemeldet ? "/settings" : "/login"}
            className={cn(
              "focus-ring hit-area order-2 inline-flex items-center whitespace-nowrap rounded-md px-3 text-small font-semibold sm:order-3",
              "text-primary transition-colors duration-fast ease-out",
              "hover:text-primary-hover motion-reduce:transition-none",
            )}
          >
            {angemeldet ? "Einstellungen" : "Anmelden"}
          </Link>
        </div>
      </div>
    </header>
  );
}
