import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalPage,
  LegalParagraph,
  Placeholder,
} from "@/components/legal/legal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NoticeBanner } from "@/components/ui/notice-banner";
import {
  PRIVACY_CARDS,
  PRIVACY_CARDS_OHNE_GERAETEKENNUNG,
} from "@/content/legal/texte";

export const metadata: Metadata = {
  title: "Datenschutz",
};

/**
 * Datenschutz-Kurzfassung.
 *
 * Sie ist die verständliche Fassung und erfüllt die Anforderungen aus
 * Art. 13/14 DSGVO ausdrücklich NICHT — dafür gibt es /privacy/vollstaendig.
 * Der Hinweis oben sagt das auch den Lesenden.
 */
export default function PrivacyPage() {
  const ohneGeraetekennung = new Set<number>(PRIVACY_CARDS_OHNE_GERAETEKENNUNG);

  return (
    <LegalPage
      title="Datenschutz"
      intro={
        <LegalParagraph>
          Das Wichtigste in verständlicher Form. Welche Daten wir brauchen,
          warum wir sie brauchen und was du darüber entscheiden kannst.
        </LegalParagraph>
      }
    >
      <div className="max-w-prose">
        <NoticeBanner
          tone="hinweis"
          title="Das ist die Kurzfassung"
        >
          <p>
            Sie erklärt die Sachlage, ersetzt aber nicht die vollständige
            Datenschutzerklärung. Alle Pflichtangaben nach Art. 13 und 14 DSGVO
            findest du in der{" "}
            <Link
              href="/privacy/vollstaendig"
              className="focus-ring rounded-md text-primary underline underline-offset-4"
            >
              vollständigen Datenschutzerklärung
            </Link>
            .
          </p>
        </NoticeBanner>
      </div>

      <section aria-labelledby="karten" className="flex flex-col gap-6">
        <h2 id="karten" className="sr-only">
          Die einzelnen Punkte
        </h2>

        <ol className="flex flex-col gap-6">
          {PRIVACY_CARDS.map((karte, index) => (
            <li key={karte.titel}>
              <Card className="max-w-prose">
                <CardHeader>
                  <CardTitle>
                    {index + 1}. {karte.titel}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                  {karte.text ? (
                    <p className="whitespace-pre-wrap text-body text-card-foreground">
                      {karte.text}
                    </p>
                  ) : (
                    <Placeholder id="textePrivacyKarten" />
                  )}

                  {/*
                    Karte 1 und Karte 9 beschrieben im Altbestand eine
                    Geräte-Kennung als Sicherheitsmaßnahme. Sie war ein
                    localStorage-Wert und im Neubau gibt es nichts dergleichen.

                    Der Platzhalter dazu erscheint nur noch, solange die Karte
                    gar keinen Text hat. Die vorläufige Fassung sagt in Karte 9
                    ausdrücklich, dass keine Geräte-Kennung ausgelesen wird —
                    damit ist die Anforderung erfüllt, und ein zusätzlicher
                    Warnkasten unter einem Text, der sie bereits erfüllt, wäre
                    irreführend.

                    Dass der Text noch ungeprüft ist, sagt der Hinweis am Kopf
                    jeder Rechtsseite. Er verschwindet erst mit der Prüfung.
                  */}
                  {ohneGeraetekennung.has(index) && !karte.text ? (
                    <Placeholder id="privacyTechnischeSicherheitsdaten" />
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </LegalPage>
  );
}
