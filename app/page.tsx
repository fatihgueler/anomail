import type { Metadata } from "next";
import Link from "next/link";
import { Ear, PenLine } from "lucide-react";

import { auth } from "@/auth";
import { CrisisNotice } from "@/components/legal/crisis-notice";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  description:
    "Schreib anonym über das, was dich belastet. Ein anderer Mensch liest deinen Brief und antwortet dir.",
};

/**
 * Startseite.
 *
 * Sie erklaert den Dienst und fuehrt an die beiden Stellen, an denen etwas
 * passiert: schreiben oder zuhoeren. Angemeldet zeigt sie diese direkt,
 * abgemeldet fuehrt sie zur Anmeldung.
 *
 * Der Krisen-Hinweis steht hier ausdruecklich mit auf der Seite. Anomail ist
 * kein Krisendienst, und wer hier zum ersten Mal landet, soll das lesen,
 * bevor er anfaengt zu schreiben.
 */
export default async function HomePage() {
  const session = await auth();
  const angemeldet = session?.user != null && !session.user.isBanned;

  return (
    <main id="hauptinhalt" className="mx-auto flex max-w-shell flex-col gap-10 p-8">
      <div className="flex max-w-prose flex-col gap-4">
        <h1 className="text-display">Anomail</h1>

        <p className="text-body text-foreground">
          Schreib auf, was dich belastet. Ein anderer Mensch liest deinen Brief
          und antwortet dir. Ihr seht voneinander nur eine zufällige Kennung,
          sonst nichts.
        </p>

        <p className="text-body text-muted-foreground">
          Keine Profile, keine Verläufe, keine Reichweite. Ein Brief, eine
          Antwort, und wenn ihr wollt, ein Gespräch daraus.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-3">
                <span className="text-primary">
                  <Icon icon={PenLine} />
                </span>
                Einen Brief schreiben
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-body text-muted-foreground">
              Nimm dir Zeit. Der Brief geht an genau eine Person, die ihn in
              Ruhe liest.
            </p>
            <div>
              <Link
                href={angemeldet ? "/write" : "/login"}
                className={cn(buttonVariants({ variant: "primary" }))}
              >
                Brief schreiben
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-3">
                <span className="text-primary">
                  <Icon icon={Ear} />
                </span>
                Jemandem zuhören
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-body text-muted-foreground">
              Du bekommst genau einen Brief. Lies ihn und antworte, wenn du
              etwas zu sagen hast.
            </p>
            <div>
              <Link
                href={angemeldet ? "/listen" : "/login"}
                className={cn(buttonVariants({ variant: "secondary" }))}
              >
                Zuhören
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {angemeldet ? (
        <nav aria-label="Dein Bereich" className="flex flex-wrap gap-3">
          <Link
            href="/my-letters"
            className={cn(buttonVariants({ variant: "tertiary" }))}
          >
            Meine Briefe
          </Link>
          <Link
            href="/notifications"
            className={cn(buttonVariants({ variant: "tertiary" }))}
          >
            Benachrichtigungen
          </Link>
          <Link
            href="/settings"
            className={cn(buttonVariants({ variant: "tertiary" }))}
          >
            Einstellungen
          </Link>
        </nav>
      ) : (
        <p className="max-w-prose text-body text-muted-foreground">
          Zum Mitmachen brauchst du nur eine E-Mail-Adresse. Ein Passwort gibt
          es nicht — du bekommst einen Anmeldelink geschickt.{" "}
          <Link
            href="/login"
            className="focus-ring rounded-md font-semibold text-primary underline underline-offset-4"
          >
            Anmelden
          </Link>
        </p>
      )}

      <CrisisNotice />

      <nav aria-label="Rechtliches und Hilfe" className="flex flex-wrap gap-3">
        <Link
          href="/help"
          className={cn(buttonVariants({ variant: "tertiary" }))}
        >
          Hilfe
        </Link>
        <Link
          href="/terms"
          className={cn(buttonVariants({ variant: "tertiary" }))}
        >
          Nutzungsregeln
        </Link>
        <Link
          href="/privacy"
          className={cn(buttonVariants({ variant: "tertiary" }))}
        >
          Datenschutz
        </Link>
        <Link
          href="/impressum"
          className={cn(buttonVariants({ variant: "tertiary" }))}
        >
          Impressum
        </Link>
      </nav>
    </main>
  );
}
