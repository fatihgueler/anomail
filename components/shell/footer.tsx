import Link from "next/link";

import { Wortmarke } from "@/components/brand/wortmarke";
import { Container } from "@/components/ui/layout";

/**
 * Fussleiste.
 *
 * Mehrspaltig, auf der Pultfarbe. Die Notrufnummern stehen hier fest und auf
 * jeder Seite - der Krisenhinweis auf der Startseite ist die ausfuehrliche
 * Fassung, das hier die immer erreichbare.
 *
 * Ruhig gesetzt, nicht alarmierend: eine Nummer, die man immer findet, hilft
 * mehr als eine, die einen anschreit.
 */

const RECHTLICHES = [
  { href: "/impressum", text: "Impressum" },
  { href: "/privacy", text: "Datenschutz" },
  { href: "/terms", text: "Nutzungsregeln" },
  { href: "/agb", text: "Nutzungsbedingungen" },
];

const DIENST = [
  { href: "/help", text: "Hilfe" },
  { href: "/contact", text: "Kontakt" },
  { href: "/write", text: "Brief schreiben" },
  { href: "/listen", text: "Zuhören" },
];

export function Footer() {
  return (
    <footer className="bg-desk text-desk-foreground">
      <Container>
        <div className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Wortmarke />
            <p className="max-w-prose text-body text-desk-foreground/80">
              Schreib anonym über das, was dich belastet. Ein Mensch liest
              deinen Brief. Ein Mensch antwortet.
            </p>
          </div>

          <FussSpalte titel="Dienst" ziele={DIENST} />
          <FussSpalte titel="Rechtliches" ziele={RECHTLICHES} />
        </div>

        <div className="border-t border-desk-foreground/15 py-8">
          <p className="max-w-prose text-small text-desk-foreground/80">
            Anomail ist kein Krisendienst und ersetzt keine professionelle
            Hilfe. In einer akuten Krise:
          </p>

          <ul className="mt-3 flex flex-wrap items-center gap-2">
            <li>
              <a
                href="tel:112"
                className="focus-ring hit-area inline-flex items-center rounded-md px-3 text-small font-semibold tabular-nums text-desk-foreground underline underline-offset-4"
              >
                Notruf 112
              </a>
            </li>
            <li>
              <a
                href="tel:08001110111"
                className="focus-ring hit-area inline-flex items-center rounded-md px-3 text-small font-semibold tabular-nums text-desk-foreground underline underline-offset-4"
              >
                Telefonseelsorge 0800 111 0 111
              </a>
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}

function FussSpalte({
  titel,
  ziele,
}: {
  titel: string;
  ziele: Array<{ href: string; text: string }>;
}) {
  return (
    <nav aria-label={titel} className="flex flex-col gap-3">
      <h2 className="font-sans text-label uppercase tracking-[0.14em] text-desk-foreground/70">
        {titel}
      </h2>

      <ul className="flex flex-col gap-1">
        {ziele.map((ziel) => (
          <li key={ziel.href}>
            <Link
              href={ziel.href}
              className="focus-ring hit-area -mx-2 inline-flex items-center rounded-md px-2 text-small text-desk-foreground underline-offset-4 transition-colors duration-fast ease-out hover:underline motion-reduce:transition-none"
            >
              {ziel.text}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
