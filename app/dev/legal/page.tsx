import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NoticeBanner } from "@/components/ui/notice-banner";
import { allPlaceholders } from "@/content/legal/platzhalter";

export const metadata: Metadata = {
  title: "Offene Rechtstexte",
};

/**
 * Übersicht aller offenen Stellen in den Rechtstexten.
 *
 * Das ist die Vorlage für die anwaltliche Prüfung: jede Lücke mit Fundort und,
 * wo nötig, der Sachlage aus dem Code. Nur in der Entwicklung erreichbar.
 */
export default function DevLegalPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const eintraege = allPlaceholders();

  return (
    <main id="hauptinhalt" className="mx-auto flex w-full max-w-shell flex-col gap-8 px-4 py-16 sm:px-6">
      <div className="flex max-w-prose flex-col gap-3">
        <p className="text-label text-muted-foreground">
          Nur in der Entwicklung erreichbar
        </p>
        <h1 className="text-display">Offene Rechtstexte</h1>
        <p className="text-body text-muted-foreground">
          {eintraege.length} Stellen sind offen und müssen vor dem Start
          anwaltlich gefüllt werden. Keine davon ist mit Beispieltext belegt.
        </p>
      </div>

      <div className="max-w-prose">
        <NoticeBanner tone="hinweis" title="Warum diese Liste so lang ist">
          <p>
            Erfundene Rechtsgrundlagen, Speicherfristen oder Firmierungen wären
            schlimmer als sichtbare Lücken: eine Lücke fällt bei der Prüfung
            auf, eine plausibel klingende Erfindung nicht.
          </p>
        </NoticeBanner>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-small">
          <caption className="sr-only">
            Alle offenen Platzhalter mit Fundort
          </caption>
          <thead>
            <tr className="border-b border-input text-left">
              <th scope="col" className="p-3 text-label">
                Kennung
              </th>
              <th scope="col" className="p-3 text-label">
                Was fehlt
              </th>
              <th scope="col" className="p-3 text-label">
                Fundort
              </th>
              <th scope="col" className="p-3 text-label">
                Hinweis
              </th>
            </tr>
          </thead>
          <tbody>
            {eintraege.map((eintrag) => (
              <tr key={eintrag.id} className="border-b border-border align-top">
                <th scope="row" className="p-3 text-left text-small font-normal">
                  <code>{eintrag.id}</code>
                </th>
                <td className="p-3">{eintrag.fehlt}</td>
                <td className="p-3 text-muted-foreground">{eintrag.fundort}</td>
                <td className="max-w-prose p-3 text-muted-foreground">
                  {eintrag.hinweis ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
