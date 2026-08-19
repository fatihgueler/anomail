import type { Metadata } from "next";

import {
  LegalPage,
  LegalParagraph,
  LegalSection,
  Placeholder,
} from "@/components/legal/legal-shell";
import { betreiber, istPlatzhalter } from "@/content/legal/betreiber";
import { CONTACT_TEXT } from "@/content/legal/texte";

export const metadata: Metadata = {
  title: "Kontakt",
};

export default function ContactPage() {
  return (
    <LegalPage title="Kontakt">
      <LegalSection id="text" title="So erreichst du uns">
        {CONTACT_TEXT ? (
          <p className="max-w-prose whitespace-pre-wrap text-body">
            {CONTACT_TEXT}
          </p>
        ) : (
          <Placeholder id="texteContact" />
        )}
      </LegalSection>

      <LegalSection id="email" title="E-Mail">
        {istPlatzhalter("email") ? (
          <Placeholder id="betreiberEmail" />
        ) : (
          <LegalParagraph>
            <a
              href={`mailto:${betreiber("email")}`}
              className="focus-ring hit-area inline-flex items-center rounded-md text-primary underline underline-offset-4"
            >
              {betreiber("email")}
            </a>
          </LegalParagraph>
        )}
      </LegalSection>
    </LegalPage>
  );
}
