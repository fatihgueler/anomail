import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalPage,
  LegalParagraph,
  LegalSection,
  Placeholder,
} from "@/components/legal/legal-shell";
import { NoticeBanner } from "@/components/ui/notice-banner";

export const metadata: Metadata = {
  title: "AGB",
};

/**
 * Allgemeine Geschäftsbedingungen.
 *
 * Vollständig offen. Der Altbestand hatte keinen Vertragsteil; die
 * Nutzungsregeln standen an seiner Stelle, sind aber Verhaltensregeln und
 * kein Vertrag.
 *
 * Hier steht deshalb nur die Gliederung. Einen Vertragstext zu erfinden wäre
 * an dieser Stelle besonders schädlich: Klauseln, die einer Prüfung nicht
 * standhalten, sind unwirksam und können den ganzen Abschnitt mitreißen.
 */
export default function AgbPage() {
  return (
    <LegalPage
      title="Allgemeine Geschäftsbedingungen"
      intro={
        <LegalParagraph>
          Diese Bedingungen regeln das Vertragsverhältnis zwischen dir und dem
          Betreiber von Anomail.
        </LegalParagraph>
      }
    >
      <div className="max-w-prose">
        <NoticeBanner tone="warnung" title="Diese AGB sind noch nicht formuliert">
          <p>
            Sämtliche Abschnitte sind offen und müssen vor dem Start anwaltlich
            erstellt werden. Sie sind bewusst nicht mit Beispieltext belegt.
          </p>
        </NoticeBanner>
      </div>

      <LegalSection id="gegenstand" title="1. Vertragsgegenstand und Leistung">
        <Placeholder id="agbVertragsgegenstand" />
      </LegalSection>

      <LegalSection id="vertragsschluss" title="2. Zustandekommen des Vertrags">
        <Placeholder id="agbVertragsschluss" />
      </LegalSection>

      <LegalSection id="pflichten" title="3. Pflichten des Nutzers">
        <LegalParagraph>
          Die Verhaltensregeln stehen unter{" "}
          <Link
            href="/terms"
            className="focus-ring rounded-md text-primary underline underline-offset-4"
          >
            Nutzungsregeln
          </Link>
          .
        </LegalParagraph>

        <Placeholder id="agbNutzerpflichten" />
      </LegalSection>

      <LegalSection id="alter" title="4. Mindestalter">
        <Placeholder id="dsgvoMindestalter" />
      </LegalSection>

      <LegalSection id="kuendigung" title="5. Kündigung und Kontolöschung">
        {/* Sachaussage über das tatsächliche Verhalten der Anwendung. */}
        <LegalParagraph>
          Du kannst dein Konto jederzeit selbst löschen. Die Löschung erfolgt
          sofort und ohne Rückfrage bei uns.
        </LegalParagraph>

        <Placeholder id="agbKuendigung" />
      </LegalSection>

      <LegalSection id="haftung" title="6. Haftung">
        <Placeholder id="agbHaftung" />
      </LegalSection>

      <LegalSection id="aenderungen" title="7. Änderungen dieser Bedingungen">
        <Placeholder id="agbAenderungsvorbehalt" />
      </LegalSection>

      <LegalSection id="recht" title="8. Anwendbares Recht und Gerichtsstand">
        <Placeholder id="agbRechtUndGerichtsstand" />
      </LegalSection>
    </LegalPage>
  );
}
