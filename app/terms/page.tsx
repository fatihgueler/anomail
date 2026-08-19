import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalPage,
  LegalParagraph,
  Placeholder,
} from "@/components/legal/legal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { TERMS_INTRO, TERMS_RULES } from "@/content/legal/texte";

export const metadata: Metadata = {
  title: "Nutzungsregeln",
};

/**
 * Nutzungsregeln.
 *
 * Verhaltensregeln, kein Vertrag. Der Vertragsteil steht unter /agb — im
 * Altbestand fehlte er vollständig, und die Regeln standen an seiner Stelle.
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Nutzungsregeln"
      intro={<LegalParagraph>{TERMS_INTRO}</LegalParagraph>}
    >
      <div className="max-w-prose">
        <NoticeBanner tone="hinweis" title="Regeln, nicht Vertrag">
          <p>
            Diese Seite beschreibt, wie wir hier miteinander umgehen. Die
            vertraglichen Bedingungen stehen in den{" "}
            <Link
              href="/agb"
              className="focus-ring rounded-md text-primary underline underline-offset-4"
            >
              AGB
            </Link>
            .
          </p>
        </NoticeBanner>
      </div>

      <section aria-labelledby="regeln" className="flex flex-col gap-6">
        <h2 id="regeln" className="sr-only">
          Die einzelnen Regeln
        </h2>

        <ol className="flex flex-col gap-6">
          {TERMS_RULES.map((regel, index) => (
            <li key={regel.titel}>
              <Card className="max-w-prose">
                <CardHeader>
                  <CardTitle>
                    {index + 1}. {regel.titel}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {regel.text ? (
                    <p className="whitespace-pre-wrap text-body text-card-foreground">
                      {regel.text}
                    </p>
                  ) : (
                    <Placeholder id="texteTerms" />
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
