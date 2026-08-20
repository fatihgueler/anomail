import type { Metadata } from "next";
import Link from "next/link";
import { Ear, EyeOff, History, PenLine, Radio } from "lucide-react";

import { auth } from "@/auth";
import { Ablauf } from "@/components/home/ablauf";
import { BriefVisual } from "@/components/home/brief-visual";
import { Faq, type Frage } from "@/components/home/faq";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Container, Falz, Section, Ueberschrift } from "@/components/ui/layout";
import { Einlauf, Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  description:
    "Schreib anonym über das, was dich belastet. Ein Mensch liest deinen Brief. Ein Mensch antwortet.",
};

const VERTRAUEN = [
  {
    icon: EyeOff,
    titel: "Keine Profile",
    text: "Kein Name, kein Bild, keine Biografie. Nur eine zufällige Kennung.",
  },
  {
    icon: History,
    titel: "Kein Verlauf",
    text: "Niemand kann sehen, was du früher geschrieben hast. Jeder Brief steht für sich.",
  },
  {
    icon: Radio,
    titel: "Keine Reichweite",
    text: "Nichts wird geteilt, bewertet oder gezählt. Ein Brief geht an einen Menschen.",
  },
];

const FRAGEN: Frage[] = [
  {
    frage: "Wer liest meinen Brief?",
    antwort:
      "Genau eine Person, die sich entschieden hat zuzuhören. Sie sieht deinen Text und deine zufällige Kennung — sonst nichts. Wer das ist, erfährst du nicht, und sie erfährt nicht, wer du bist.",
  },
  {
    frage: "Wie lange dauert es, bis ich eine Antwort bekomme?",
    antwort:
      "Das hängt davon ab, wie viele Menschen gerade zuhören. Es können Stunden sein, manchmal länger. Sobald eine Antwort da ist, findest du sie unter deinen Briefen.",
  },
  {
    frage: "Was heißt anonym hier genau?",
    antwort:
      "Deine E-Mail-Adresse brauchen wir für die Anmeldung, und sie wird anderen Nutzern nie angezeigt. Nach außen bist du ausschließlich deine Anomail-ID. Auch die Moderation sieht deine Adresse nicht.",
  },
  {
    frage: "Muss ich antworten, wenn ich einen Brief bekomme?",
    antwort:
      "Nein. Wenn du merkst, dass du nichts zu sagen hast, gib den Brief zurück — er geht dann an jemand anderen. Das ist kein Versagen, sondern der ehrlichere Weg.",
  },
  {
    frage: "Was passiert, wenn mir jemand etwas Verletzendes schreibt?",
    antwort:
      "Du kannst jede Nachricht melden und die Person blockieren. Die Moderation sieht sich das an. Ob du jemanden blockiert hast, erfährt die Gegenseite nicht.",
  },
  {
    frage: "Kann ich alles wieder löschen?",
    antwort:
      "Ja. Einzelne Briefe, ganze Briefwechsel oder dein gesamtes Konto. Beim Löschen des Kontos werden deine Adresse und deine Kennung entfernt und deine Nachrichten geleert.",
  },
];

export default async function HomePage() {
  const session = await auth();
  const angemeldet = session?.user != null && !session.user.isBanned;

  const schreibenZiel = angemeldet ? "/write" : "/login";
  const zuhoerenZiel = angemeldet ? "/listen" : "/login";

  return (
    <main id="hauptinhalt">
      {/* ---------------------------------------------------------- 1. Hero */}
      <Section abstand="weit" className="overflow-hidden">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="flex flex-col gap-8">
            <Einlauf>
              <h1 className="text-display">
                Schreib auf, was dich&nbsp;belastet.
              </h1>
            </Einlauf>

            <Einlauf verzoegerung={60}>
              <p className="max-w-prose text-lead text-muted-foreground">
                Ein Mensch liest deinen Brief. Ein Mensch antwortet. Ihr seht
                voneinander nur eine zufällige Kennung — kein Name, kein Profil,
                keine Vergangenheit.
              </p>
            </Einlauf>

            <Einlauf verzoegerung={120}>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={schreibenZiel}
                  className={cn(buttonVariants({ variant: "primary" }))}
                >
                  <Icon icon={PenLine} />
                  Brief schreiben
                </Link>

                <Link
                  href={zuhoerenZiel}
                  className={cn(buttonVariants({ variant: "accent" }))}
                >
                  <Icon icon={Ear} />
                  Jemandem zuhören
                </Link>
              </div>
            </Einlauf>
          </div>

          <Einlauf verzoegerung={180}>
            <BriefVisual />
          </Einlauf>
        </div>
      </Section>

      {/* -------------------------------------------------- 2. Trust-Zeile */}
      <Container>
        <Falz />
      </Container>

      <Section abstand="eng" aria-label="Was Anomail nicht tut">
        <ul className="grid gap-8 sm:grid-cols-3">
          {VERTRAUEN.map((eintrag, index) => (
            <Reveal
              als="li"
              key={eintrag.titel}
              verzoegerung={index * 80}
              className="flex flex-col gap-2"
            >
              <span className="text-accent">
                <Icon icon={eintrag.icon} />
              </span>
              <h2 className="font-sans text-label uppercase tracking-[0.14em] text-foreground">
                {eintrag.titel}
              </h2>
              <p className="text-small text-muted-foreground">{eintrag.text}</p>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* ------------------------------------------- 3. So funktioniert's */}
      <Section aria-labelledby="ablauf">
        <div className="flex flex-col gap-12">
          <Reveal>
            <Ueberschrift augenbraue="Der Weg eines Briefs" id="ablauf">
              Drei Zustände, mehr nicht.
            </Ueberschrift>
          </Reveal>

          <Ablauf />
        </div>
      </Section>

      {/* ------------------------------------------------ 4. Rollen-Karten */}
      <Section abstand="normal" aria-labelledby="rollen">
        <div className="flex flex-col gap-12">
          <Reveal>
            <Ueberschrift augenbraue="Zwei Wege hinein" id="rollen">
              Schreiben oder zuhören.
            </Ueberschrift>
          </Reveal>

          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal>
              <RollenKarte
                icon={PenLine}
                titel="Einen Brief schreiben"
                text="Nimm dir Zeit. Zwischen 80 und 4000 Zeichen — genug, um wirklich etwas zu sagen, und wenig genug, dass jemand es in Ruhe lesen kann. Der Brief geht an genau eine Person."
                aktion="Brief schreiben"
                href={schreibenZiel}
                variante="primary"
              />
            </Reveal>

            <Reveal verzoegerung={80}>
              <RollenKarte
                icon={Ear}
                titel="Jemandem zuhören"
                text="Du bekommst genau einen Brief, nicht eine Liste. Lies ihn und antworte, wenn du etwas zu sagen hast. Wenn nicht, gib ihn zurück — er geht dann an jemand anderen."
                aktion="Zuhören"
                href={zuhoerenZiel}
                variante="accent"
              />
            </Reveal>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------- 5. Anonymität, Kennung */}
      <Section aria-labelledby="kennung">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="flex flex-col gap-6">
              <Ueberschrift augenbraue="Anonymität" id="kennung">
                Das hier ist alles, was die andere Person von dir sieht.
              </Ueberschrift>

              <p className="max-w-prose text-body text-muted-foreground">
                Deine Anomail-ID wird bei der ersten Anmeldung einmal vergeben
                und ändert sich nie. Sie hängt an keinem Namen und an keiner
                Adresse. Löschst du dein Konto, wird sie nie wieder an jemand
                anderen vergeben.
              </p>
            </div>
          </Reveal>

          <Reveal verzoegerung={80}>
            <div className="flex justify-center">
              <div className="rounded-xl border border-border bg-card px-8 py-10 text-center shadow-paper-3">
                <span className="block font-sans text-label uppercase tracking-[0.14em] text-muted-foreground">
                  Deine Kennung
                </span>
                <span className="mt-4 block font-mono text-kennung text-primary sm:text-title">
                  AN-4KTP-9WXR
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ------------------------------------------------------------ 6. FAQ */}
      <Section aria-labelledby="faq">
        <div className="flex flex-col gap-10">
          <Reveal>
            <Ueberschrift augenbraue="Fragen" id="faq">
              Was Menschen vorher wissen wollen.
            </Ueberschrift>
          </Reveal>

          <Reveal>
            {/* Der Inhalt wird begrenzt, nicht der Container: sonst saesse
                der Abschnitt gegen alle anderen verschoben. */}
            <div className="max-w-prose">
              <Faq eintraege={FRAGEN} />
            </div>
          </Reveal>
        </div>
      </Section>

      {/* --------------------------------------------------- 7. Krisenhinweis */}
      <Section abstand="eng" aria-labelledby="krise">
        <Reveal>
          <div className="flex max-w-prose flex-col gap-4 rounded-lg border border-accent-soft bg-accent-soft/60 p-6">
            <h2 id="krise" className="font-serif text-subtitle text-foreground">
              Anomail ist kein Krisendienst
            </h2>

            <p className="max-w-prose text-body text-foreground">
              Anomail ersetzt keine professionelle Hilfe oder Therapie. Wenn es
              dir gerade sehr schlecht geht, wende dich bitte an Menschen, die
              dafür ausgebildet sind. Sie sind rund um die Uhr erreichbar, und
              der Anruf kostet nichts.
            </p>

            <ul className="flex flex-wrap gap-2">
              <li>
                <a
                  href="tel:08001110111"
                  className="focus-ring hit-area inline-flex items-center rounded-md px-3 text-body font-semibold tabular-nums text-primary underline underline-offset-4"
                >
                  Telefonseelsorge 0800 111 0 111
                </a>
              </li>
              <li>
                <a
                  href="tel:112"
                  className="focus-ring hit-area inline-flex items-center rounded-md px-3 text-body font-semibold tabular-nums text-primary underline underline-offset-4"
                >
                  Notruf 112
                </a>
              </li>
            </ul>
          </div>
        </Reveal>
      </Section>

      {/* ------------------------------------------------- 8. Abschluss-CTA */}
      <Section pult abstand="weit" aria-labelledby="abschluss">
        <Reveal>
          <div className="flex flex-col items-start gap-8">
            <h2
              id="abschluss"
              className="max-w-prose text-title text-desk-foreground"
            >
              Es muss nicht gut formuliert sein. Es muss nur wahr sein.
            </h2>

            <p className="max-w-prose text-body text-desk-foreground/80">
              Zum Mitmachen brauchst du eine E-Mail-Adresse. Ein Passwort gibt
              es nicht — du bekommst einen Anmeldelink geschickt.
            </p>

            <Link
              href={schreibenZiel}
              className={cn(
                buttonVariants({ variant: "primary" }),
                // Auf der Pultflaeche steht der Knopf als Papier.
                "bg-desk-foreground text-desk hover:bg-desk-foreground/90 active:bg-desk-foreground/80",
              )}
            >
              <Icon icon={PenLine} />
              Brief schreiben
            </Link>
          </div>
        </Reveal>
      </Section>
    </main>
  );
}

function RollenKarte({
  icon,
  titel,
  text,
  aktion,
  href,
  variante,
}: {
  icon: typeof PenLine;
  titel: string;
  text: string;
  aktion: string;
  href: string;
  variante: "primary" | "accent";
}) {
  return (
    <Card interactive className="flex h-full flex-col">
      <CardHeader>
        <span className={variante === "primary" ? "text-primary" : "text-accent"}>
          <Icon icon={icon} />
        </span>
        <CardTitle>{titel}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-6">
        <p className="text-body text-muted-foreground">{text}</p>

        <div>
          <Link
            href={href}
            className={cn(buttonVariants({ variant: variante }))}
          >
            {aktion}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
