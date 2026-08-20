import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { RETAINED_AFTER_DELETION } from "@/content/legal/aufbewahrung";
import { requireActiveUser } from "@/lib/auth/guard";
import { cn } from "@/lib/utils";

import { DeleteAccountForm } from "./delete-form";

export const metadata: Metadata = {
  title: "Konto löschen",
};

export const dynamic = "force-dynamic";

/** Was verschwindet. Beschreibt genau, was delete_own_account() tut. */
const WIRD_GELOESCHT = [
  "Deine E-Mail-Adresse. Wir können dich danach nicht mehr zuordnen.",
  "Deine Anomail-ID. Sie wird zurückgezogen und nie wieder an jemand anderen vergeben.",
  "Briefe von dir, die noch auf eine Antwort warten. Sie erreichen dann niemanden mehr.",
  "Der Text deiner Nachrichten in bestehenden Briefwechseln.",
  "Deine Benachrichtigungen und deine Blockierliste.",
  "Alle deine Anmeldungen. Du bist sofort überall abgemeldet.",
];

/** Was bleibt, und warum. */
const BLEIBT_BESTEHEN = [
  "Die Briefwechsel selbst. Sie werden beendet, aber nicht gelöscht — sonst würde der Verlauf der anderen Person mitverschwinden.",
  "An der Stelle deiner Nachrichten steht ein Hinweis, dass hier eine Nachricht gelöscht wurde. Der Verlauf bricht damit nicht ab.",
  "Was andere geschrieben haben. Das gehört ihnen, nicht dir.",
];

export default async function DeleteAccountPage() {
  const session = await requireActiveUser("/delete-account");

  return (
    <main id="hauptinhalt" className="mx-auto flex w-full max-w-shell flex-col gap-10 px-4 py-16 sm:px-6">
      <div className="flex max-w-prose flex-col gap-3">
        <h1 className="text-display">Konto löschen</h1>
        <p className="text-body text-muted-foreground">
          Hier löschst du dein Konto. Das geschieht sofort, nicht auf Anfrage
          und ohne Wartezeit.
        </p>
      </div>

      <div className="max-w-prose">
        <NoticeBanner tone="warnung" title="Das lässt sich nicht rückgängig machen">
          <p>
            Es gibt keine Wiederherstellung und keine Frist, innerhalb derer du
            es dir anders überlegen kannst. Auch deine Anomail-ID bekommst du
            nicht zurück.
          </p>
        </NoticeBanner>
      </div>

      <section aria-labelledby="was-passiert" className="flex flex-col gap-6">
        <h2 id="was-passiert" className="text-title">
          Was genau passiert
        </h2>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Das wird gelöscht</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {WIRD_GELOESCHT.map((eintrag) => (
                  <li key={eintrag} className="text-body text-card-foreground">
                    {eintrag}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Das bleibt bestehen</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {BLEIBT_BESTEHEN.map((eintrag) => (
                  <li key={eintrag} className="text-body text-card-foreground">
                    {eintrag}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="aufbewahrung" className="flex max-w-prose flex-col gap-4">
        <h2 id="aufbewahrung" className="text-title">
          Was begrenzt aufbewahrt wird
        </h2>

        <p className="text-body text-muted-foreground">
          Einige Daten zur Sicherheit und zur Moderation bleiben eine begrenzte
          Zeit erhalten. Sie enthalten danach keinen Bezug mehr zu dir.
        </p>

        <ul className="flex flex-col gap-3">
          {RETAINED_AFTER_DELETION.map((eintrag) => (
            <li key={eintrag.bereich} className="text-body">
              <span className="font-semibold">{eintrag.bereich}: </span>
              {eintrag.was}
            </li>
          ))}
        </ul>

        <p className="text-small text-muted-foreground">
          Die genaue Frist steht in der{" "}
          <Link
            href="/privacy/vollstaendig"
            className="focus-ring rounded-md text-primary underline underline-offset-4"
          >
            vollständigen Datenschutzerklärung
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="vorher" className="flex max-w-prose flex-col gap-4">
        <h2 id="vorher" className="text-title">
          Vorher deine Daten mitnehmen
        </h2>

        <p className="text-body text-muted-foreground">
          Nach der Löschung kommst du nicht mehr an deine Daten. Wenn du sie
          behalten möchtest, lade sie vorher herunter.
        </p>

        <div>
          <Link
            href="/api/account/export"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "whitespace-nowrap",
            )}
          >
            Meine Daten herunterladen
          </Link>
        </div>
      </section>

      <section aria-labelledby="loeschen" className="flex flex-col gap-4">
        <h2 id="loeschen" className="text-title">
          Löschung bestätigen
        </h2>

        <DeleteAccountForm anomailId={session.user.anomailId} />
      </section>
    </main>
  );
}
