import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Section } from "@/components/ui/layout";
import { Einlauf } from "@/components/ui/reveal";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Anmelden",
};

type LoginPageProps = {
  searchParams: Promise<{ weiter?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { weiter } = await searchParams;

  // Nur interne Ziele. Ein offenes Weiterleitungsziel waere ein Einfallstor,
  // um Nutzer nach der Anmeldung auf eine fremde Seite zu schicken.
  const safeWeiter =
    weiter && weiter.startsWith("/") && !weiter.startsWith("//")
      ? weiter
      : undefined;

  return (
    <main id="hauptinhalt">
      <Section breite="narrow" abstand="weit">
        <Einlauf className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-title">Anmelden</h1>
            <p className="text-body text-muted-foreground">
              Anomail kommt ohne Passwort aus. Du bekommst einen Link per
              E-Mail und bist damit angemeldet.
            </p>
          </div>

          {safeWeiter ? (
            <p className="text-small text-muted-foreground">
              Nach der Anmeldung geht es dort weiter, wo du hinwolltest.
            </p>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Anmeldelink anfordern</CardTitle>
              <CardDescription>
                Deine Adresse sehen nur wir. Anderen Nutzern wird sie nie
                angezeigt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm weiter={safeWeiter} />
            </CardContent>
          </Card>
        </Einlauf>
      </Section>
    </main>
  );
}
