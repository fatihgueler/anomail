import type { Metadata } from "next";

import {
  LegalPage,
  LegalParagraph,
  LegalSection,
  Placeholder,
} from "@/components/legal/legal-shell";
import { betreiber, istPlatzhalter } from "@/content/legal/betreiber";

export const metadata: Metadata = {
  title: "Impressum",
};

/**
 * Impressum.
 *
 * Rechtsverweise auf das DDG, nicht auf das TMG: das Telemediengesetz ist seit
 * dem 14.05.2024 außer Kraft. Der Alttext berief sich noch auf § 5 TMG.
 *
 * Die Paragraphennummer zu tauschen ist aber nicht dasselbe wie eine geprüfte
 * Formulierung — der Haftungstext trägt deshalb einen eigenen Prüfvermerk.
 */
export default function ImpressumPage() {
  return (
    <LegalPage
      title="Impressum"
      intro={
        <LegalParagraph>
          Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG).
        </LegalParagraph>
      }
    >
      <LegalSection id="anbieter" title="Diensteanbieter">
        {istPlatzhalter("name") ? (
          <Placeholder id="betreiberName" />
        ) : (
          <LegalParagraph>{betreiber("name")}</LegalParagraph>
        )}

        {istPlatzhalter("rechtsform") ? (
          <Placeholder id="betreiberRechtsform" />
        ) : (
          <LegalParagraph>{betreiber("rechtsform")}</LegalParagraph>
        )}

        {istPlatzhalter("anschrift") ? (
          <Placeholder id="betreiberAnschrift" />
        ) : (
          <LegalParagraph>{betreiber("anschrift")}</LegalParagraph>
        )}
      </LegalSection>

      <LegalSection id="kontakt" title="Kontakt">
        {istPlatzhalter("email") ? (
          <Placeholder id="betreiberEmail" />
        ) : (
          <LegalParagraph>
            E-Mail:{" "}
            <a
              href={`mailto:${betreiber("email")}`}
              className="focus-ring rounded-md text-primary underline underline-offset-4"
            >
              {betreiber("email")}
            </a>
          </LegalParagraph>
        )}
      </LegalSection>

      <LegalSection id="register" title="Register und Umsatzsteuer">
        <Placeholder id="betreiberRegister" />
        <Placeholder id="betreiberUmsatzsteuerId" />
      </LegalSection>

      <LegalSection
        id="verantwortlicher"
        title="Redaktionell verantwortlich nach § 18 Abs. 2 MStV"
      >
        {istPlatzhalter("verantwortlicher") ? (
          <Placeholder id="betreiberVerantwortlicher" />
        ) : (
          <LegalParagraph>{betreiber("verantwortlicher")}</LegalParagraph>
        )}
      </LegalSection>

      <LegalSection id="haftung" title="Haftung für Inhalte und Links">
        <LegalParagraph>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte
          auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach
          den §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht
          verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
          überwachen oder nach Umständen zu forschen, die auf eine
          rechtswidrige Tätigkeit hinweisen.
        </LegalParagraph>

        {/*
          Der Absatz oben ist die auf DDG umgestellte Fassung des üblichen
          Wortlauts. Ob er in dieser Form trägt, ist nicht geprüft.
        */}
        <Placeholder id="impressumHaftungstext" />
      </LegalSection>

      <LegalSection id="schlichtung" title="Verbraucherschlichtung">
        <Placeholder id="impressumVerbraucherschlichtung" />
      </LegalSection>
    </LegalPage>
  );
}
