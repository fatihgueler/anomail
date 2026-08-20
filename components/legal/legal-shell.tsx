import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { CrisisNotice } from "@/components/legal/crisis-notice";
import { Icon } from "@/components/ui/icon";
import { placeholderText, type PlaceholderId } from "@/content/legal/platzhalter";
import { cn } from "@/lib/utils";

/**
 * Bausteine der Rechtsseiten.
 *
 * Ein Platzhalter wird sichtbar gerendert, nicht versteckt. Wer diese Seiten
 * liest, soll sofort erkennen, dass an dieser Stelle noch nichts steht — sonst
 * wirkt eine unvollständige Erklärung wie eine vollständige.
 */

export function Placeholder({ id }: { id: PlaceholderId }) {
  return (
    <p
      className={cn(
        "flex max-w-prose items-start gap-3 rounded-lg border-2 border-destructive",
        "bg-muted p-4 text-body text-destructive",
      )}
    >
      <span className="mt-1 shrink-0">
        <Icon icon={AlertTriangle} />
      </span>
      <span>{placeholderText(id)}</span>
    </p>
  );
}

/** Ein Abschnitt einer Rechtsseite mit eigener Überschrift. */
export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function LegalSubsection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-subtitle">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function LegalParagraph({ children }: { children: React.ReactNode }) {
  return <p className="max-w-prose text-body">{children}</p>;
}

/** Rahmen jeder Rechtsseite. Genau ein h1, danach lückenlos h2 und h3. */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main
      id="hauptinhalt"
      className="mx-auto flex w-full max-w-shell flex-col gap-10 px-4 py-16 sm:px-6"
    >
      <div className="flex max-w-prose flex-col gap-3">
        <h1 className="text-display">{title}</h1>
        {intro}
      </div>

      {children}

      {/*
        Krisen-Hinweis in der Fußzeile jeder Rechtsseite. Eine anwendungsweite
        Fußzeile gibt es noch nicht — app/layout.tsx liegt außerhalb dieses
        Arbeitspakets. Sobald sie entsteht, wandert dieser Baustein dorthin.
      */}
      <div className="max-w-prose">
        <CrisisNotice />
      </div>

      <nav aria-label="Weitere Rechtstexte" className="border-t border-border pt-6">
        <ul className="flex flex-wrap gap-4">
          {[
            { href: "/privacy", label: "Datenschutz" },
            { href: "/privacy/vollstaendig", label: "Datenschutz vollständig" },
            { href: "/terms", label: "Nutzungsregeln" },
            { href: "/agb", label: "AGB" },
            { href: "/impressum", label: "Impressum" },
            { href: "/help", label: "Hilfe" },
            { href: "/contact", label: "Kontakt" },
          ].map((entry) => (
            <li key={entry.href}>
              <Link
                href={entry.href}
                className="focus-ring hit-area inline-flex items-center rounded-lg px-3 text-body text-primary underline underline-offset-4"
              >
                {entry.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
