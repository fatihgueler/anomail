import type { Metadata } from "next";

import {
  LegalPage,
  LegalParagraph,
  Placeholder,
} from "@/components/legal/legal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HELP_CARDS, HELP_CARD_WIDERSPRUCH } from "@/content/legal/texte";

export const metadata: Metadata = {
  title: "Hilfe",
};

export default function HelpPage() {
  const karten = [...HELP_CARDS, HELP_CARD_WIDERSPRUCH];

  return (
    <LegalPage
      title="Hilfe"
      intro={
        <LegalParagraph>
          Wie Anomail funktioniert, was der Dienst leisten kann und was nicht.
        </LegalParagraph>
      }
    >
      <section aria-labelledby="karten" className="flex flex-col gap-6">
        <h2 id="karten" className="sr-only">
          Die einzelnen Themen
        </h2>

        <ol className="flex flex-col gap-6">
          {karten.map((karte) => (
            <li key={karte.titel}>
              <Card className="max-w-prose">
                <CardHeader>
                  <CardTitle>{karte.titel}</CardTitle>
                </CardHeader>

                <CardContent>
                  {karte.text ? (
                    <p className="whitespace-pre-wrap text-body text-card-foreground">
                      {karte.text}
                    </p>
                  ) : (
                    <Placeholder id="texteHelp" />
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </LegalPage>
  );
}
