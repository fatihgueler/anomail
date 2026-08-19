import type { Metadata } from "next";

import {
  LegalPage,
  LegalParagraph,
  LegalSection,
  LegalSubsection,
  Placeholder,
} from "@/components/legal/legal-shell";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { RETAINED_AFTER_DELETION } from "@/content/legal/aufbewahrung";
import { betreiber, istPlatzhalter } from "@/content/legal/betreiber";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
};

/**
 * Vollständige Datenschutzerklärung.
 *
 * Die Gliederung steht vollständig. Gefüllt ist nur, was sich aus dem Code
 * eindeutig ablesen lässt — das sind Sachaussagen über das tatsächliche
 * Verhalten der Anwendung. Alles, was eine rechtliche Bewertung erfordert
 * (Rechtsgrundlage, Frist, Auftragsverarbeiter), bleibt Platzhalter.
 *
 * Auch die Sachaussagen tragen einen Prüfvermerk, wo sie in eine Bewertung
 * übergehen.
 */
export default function VollstaendigePrivacyPage() {
  return (
    <LegalPage
      title="Datenschutzerklärung"
      intro={
        <LegalParagraph>
          Diese Erklärung beschreibt, welche personenbezogenen Daten bei der
          Nutzung von Anomail verarbeitet werden, zu welchem Zweck und auf
          welcher Grundlage.
        </LegalParagraph>
      }
    >
      <div className="max-w-prose">
        <NoticeBanner tone="warnung" title="Diese Erklärung ist noch nicht vollständig">
          <p>
            Die mit einem Prüfvermerk gekennzeichneten Abschnitte sind offen und
            müssen vor dem Start anwaltlich gefüllt werden. Sie sind bewusst
            nicht mit Beispieltext belegt.
          </p>
        </NoticeBanner>
      </div>

      <LegalSection id="verantwortlicher" title="1. Verantwortlicher">
        <LegalParagraph>
          Verantwortlich für die Verarbeitung im Sinne von Art. 4 Nr. 7 DSGVO
          ist:
        </LegalParagraph>

        {istPlatzhalter("name") ? (
          <Placeholder id="betreiberName" />
        ) : (
          <LegalParagraph>{betreiber("name")}</LegalParagraph>
        )}

        {istPlatzhalter("anschrift") ? (
          <Placeholder id="betreiberAnschrift" />
        ) : (
          <LegalParagraph>{betreiber("anschrift")}</LegalParagraph>
        )}

        {istPlatzhalter("email") ? (
          <Placeholder id="betreiberEmail" />
        ) : (
          <LegalParagraph>{betreiber("email")}</LegalParagraph>
        )}
      </LegalSection>

      <LegalSection id="daten" title="2. Welche Daten verarbeitet werden">
        {/* Sachaussage: aus dem Datenbankschema eindeutig ablesbar. */}
        <LegalParagraph>
          Bei der Anmeldung wird deine E-Mail-Adresse gespeichert. Sie dient
          ausschließlich dem Versand des Anmeldelinks und der Zuordnung deines
          Kontos. Anderen Nutzern wird sie zu keinem Zeitpunkt angezeigt.
        </LegalParagraph>

        <LegalParagraph>
          Zusätzlich wird eine zufällige Kennung im Format AN-XXXX-XXXX
          vergeben. Sie ist das Einzige, was andere Nutzer von dir sehen, und
          lässt sich ohne Zugriff auf unsere Datenbank keiner Person zuordnen.
        </LegalParagraph>

        <LegalParagraph>
          Die Briefe, Antworten und Nachrichten, die du schreibst, werden
          gespeichert, solange der zugehörige Briefwechsel besteht. Ohne
          Speicherung könnte dein Gegenüber sie nicht lesen.
        </LegalParagraph>

        <LegalParagraph>
          Beim Melden eines Inhalts wird festgehalten, wer was aus welchem Grund
          gemeldet hat. Bei einer Entscheidung der Moderation wird zusätzlich
          die Begründung gespeichert und dir angezeigt.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="rechtsgrundlagen" title="3. Rechtsgrundlagen">
        <Placeholder id="dsgvoRechtsgrundlagen" />
      </LegalSection>

      <LegalSection id="speicherdauer" title="4. Speicherdauer und Löschung">
        {/* Sachaussage: das tatsächliche Verhalten von delete_own_account(). */}
        <LegalParagraph>
          Löschst du dein Konto, geschieht das sofort und nicht auf Anfrage.
          Deine E-Mail-Adresse und deine Anomail-ID werden entfernt, wartende
          Briefe verschwinden, und die Inhalte deiner Nachrichten werden
          geleert. Die Blasen bleiben als Platzhalter stehen, damit der Verlauf
          deines Gegenübers nicht abbricht.
        </LegalParagraph>

        <LegalParagraph>
          Deine Anomail-ID wird nach der Löschung nie erneut vergeben.
        </LegalParagraph>

        <LegalSubsection
          id="speicherdauer-verbleib"
          title="Was begrenzt erhalten bleibt"
        >
          <ul className="flex max-w-prose flex-col gap-2">
            {RETAINED_AFTER_DELETION.map((eintrag) => (
              <li key={eintrag.bereich} className="text-body">
                <span className="font-semibold">{eintrag.bereich}: </span>
                {eintrag.was}
              </li>
            ))}
          </ul>

          <Placeholder id="dsgvoSpeicherdauer" />
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="empfaenger" title="5. Empfänger und Auftragsverarbeiter">
        <LegalSubsection id="empfaenger-hosting" title="Hosting">
          <Placeholder id="dsgvoAuftragsverarbeiterHosting" />
        </LegalSubsection>

        <LegalSubsection id="empfaenger-mail" title="Versand der Anmeldelinks">
          <Placeholder id="dsgvoAuftragsverarbeiterMail" />
        </LegalSubsection>

        <LegalSubsection id="empfaenger-llm" title="Inhaltsprüfung">
          {/* Sachaussage über die Voreinstellung im Code. */}
          <LegalParagraph>
            Jeder Brief und jede Antwort wird vor der Veröffentlichung auf
            Signale für Selbstgefährdung, Gewalt und unzulässige Inhalte
            geprüft. In der aktuellen Einstellung läuft diese Prüfung
            vollständig auf unserem eigenen Server; der Text verlässt ihn dabei
            nicht.
          </LegalParagraph>

          <Placeholder id="dsgvoAuftragsverarbeiterLlm" />
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="drittland" title="6. Übermittlung in Drittländer">
        <Placeholder id="dsgvoDrittland" />
      </LegalSection>

      <LegalSection id="rechte" title="7. Deine Rechte">
        <LegalParagraph>
          Dir stehen die folgenden Rechte zu: Auskunft über die zu deiner Person
          gespeicherten Daten (Art. 15 DSGVO), Berichtigung unrichtiger Daten
          (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung
          (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen die
          Verarbeitung (Art. 21).
        </LegalParagraph>

        {/* Sachaussage: beide Wege sind gebaut. */}
        <LegalParagraph>
          Dein Auskunftsrecht kannst du unmittelbar ausüben: unter
          Einstellungen findest du einen Export deiner Daten im JSON-Format.
          Dein Löschrecht übst du unter Konto löschen aus; die Löschung erfolgt
          sofort.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="beschwerde" title="8. Beschwerderecht">
        <LegalParagraph>
          Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde über
          die Verarbeitung deiner personenbezogenen Daten zu beschweren.
        </LegalParagraph>

        <Placeholder id="dsgvoAufsichtsbehoerde" />
      </LegalSection>

      <LegalSection
        id="automatisiert"
        title="9. Automatisierte Entscheidungsfindung"
      >
        {/* Sachaussage über den Ablauf im Code. */}
        <LegalParagraph>
          Die Inhaltsprüfung kann dazu führen, dass ein Brief oder eine Antwort
          zurückgehalten wird und zunächst niemanden erreicht. Diese Einstufung
          entsteht automatisiert. Der zurückgehaltene Beitrag wird anschließend
          der Moderation vorgelegt, die die Entscheidung bestätigt oder
          aufhebt. Du siehst die Begründung und kannst ihr widersprechen.
        </LegalParagraph>

        <Placeholder id="dsgvoAutomatisierteEntscheidung" />
      </LegalSection>

      <LegalSection id="alter" title="10. Mindestalter">
        <Placeholder id="dsgvoMindestalter" />
      </LegalSection>

      <LegalSection id="tracking" title="11. Cookies und Reichweitenmessung">
        {/*
          Sachaussage, im Code überprüfbar: es ist kein externer Tracker
          eingebunden. Das einzige Cookie ist das Sitzungs-Cookie der Anmeldung,
          das für den Betrieb erforderlich ist.

          Käme später Tracking hinzu, wäre § 25 TDDDG einschlägig und eine
          Einwilligung erforderlich. Vorsorglich gebaut wird dafür nichts.
        */}
        <LegalParagraph>
          Anomail setzt keine Analyse- oder Trackingdienste ein und bindet keine
          Inhalte von Drittanbietern ein. Es gibt keine Reichweitenmessung und
          keine Werbung.
        </LegalParagraph>

        <LegalParagraph>
          Gesetzt wird ausschließlich ein Cookie für deine Anmeldung. Ohne
          dieses Cookie könntest du nicht angemeldet bleiben; es ist für den
          Betrieb des Dienstes erforderlich. Ein Einwilligungsbanner ist dafür
          nicht nötig.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
