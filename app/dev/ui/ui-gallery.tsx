"use client";

import { Bell, Send, Trash2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { CategoryChipGroup } from "@/components/ui/category-chip";
import { ChatBubble } from "@/components/ui/chat-bubble";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { AppDialog, type DialogVariant } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { OffCanvas, OffCanvasLink } from "@/components/ui/off-canvas";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { ALL_STATUSES, StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { SPACING_SCALE, TYPE_SCALE } from "@/lib/tokens/typography";

import { ContrastTable } from "./contrast-table";
import { Section, Specimen, SpecimenGrid } from "./section";

const KATEGORIEN = [
  { value: "einsamkeit", label: "Einsamkeit" },
  { value: "trauer", label: "Trauer" },
  { value: "arbeit", label: "Arbeit" },
  { value: "familie", label: "Familie" },
  { value: "gesundheit", label: "Gesundheit" },
];

export function UiGallery() {
  const [brieftext, setBrieftext] = React.useState(
    "Ich weiß nicht genau, wo ich anfangen soll.",
  );
  const [kategorien, setKategorien] = React.useState<string[]>(["trauer"]);
  const [benachrichtigungen, setBenachrichtigungen] = React.useState(true);
  const [offenerDialog, setOffenerDialog] = React.useState<DialogVariant | null>(
    null,
  );
  const [bannerSichtbar, setBannerSichtbar] = React.useState(true);
  const [letzteAktion, setLetzteAktion] = React.useState("Noch nichts");

  // Merkt sich den Knopf, der den Dialog geoeffnet hat, damit der Fokus
  // beim Schliessen dorthin zurueckkehrt.
  const dialogAusloeser = React.useRef<HTMLElement | null>(null);

  const oeffneDialog =
    (variante: DialogVariant) => (event: React.MouseEvent<HTMLButtonElement>) => {
      dialogAusloeser.current = event.currentTarget;
      setOffenerDialog(variante);
    };

  return (
    <div className="mx-auto flex max-w-shell flex-col gap-16 p-8">
      <header className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-label text-muted-foreground">
              Nur in der Entwicklung erreichbar
            </p>
            <h1 className="text-display">Anomail Komponenten</h1>
            <p className="max-w-prose text-body text-muted-foreground">
              Jede Komponente in jedem Zustand. Die Kontrasttabelle unten rechnet
              alle verwendeten Farbkombinationen aus den Tokens nach.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <p className="text-small text-muted-foreground">
          Zuletzt ausgelöst: {letzteAktion}
        </p>
      </header>

      <Section
        id="farben"
        title="Farben und Kontraste"
        description="Berechnet nach WCAG 2.1. Text braucht mindestens 4,5:1, Bedienelemente mindestens 3:1."
      >
        <ContrastTable theme="light" />
        <ContrastTable theme="dark" />
      </Section>

      <Section
        id="typografie"
        title="Typografie"
        description="Sechs Stufen, keine weiteren. Die kleinste Stufe liegt bei 14px."
      >
        <div className="flex flex-col gap-6">
          {TYPE_SCALE.map((step) => (
            <div
              key={step.name}
              className="flex flex-col gap-2 border-b border-border pb-4"
            >
              <p className="text-label text-muted-foreground">
                {step.name} · {step.size}/{step.lineHeight} · Gewicht{" "}
                {step.weight} · Laufweite {step.tracking} · {step.usage}
              </p>
              <p className={step.className}>
                Die Wärme bleibt in Farbe, Sprache und Rhythmus.
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="abstaende"
        title="Abstands-Raster"
        description="Acht Schritte auf 8pt-Basis. Andere Werte gibt es im System nicht."
      >
        <div className="flex flex-col gap-3">
          {SPACING_SCALE.map((step) => (
            <div key={step.token} className="flex items-center gap-4">
              <code className="w-16 shrink-0 text-small tabular-nums">
                {step.value}
              </code>
              <span
                aria-hidden="true"
                className="h-4 rounded-sm bg-primary"
                style={{ width: step.value }}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="buttons"
        title="Button"
        description="Vier Stufen. Primär und Sekundär sind 52px hoch, Tertiär und Gefahr halten mindestens 44px Trefferfläche."
      >
        {(["primary", "secondary", "tertiary"] as const).map((variant) => (
          <div key={variant} className="flex flex-col gap-4">
            <h3 className="text-subtitle">
              {variant === "primary"
                ? "Primär"
                : variant === "secondary"
                  ? "Sekundär"
                  : "Tertiär"}
            </h3>
            <SpecimenGrid>
              <Specimen state="Standard">
                <Button
                  variant={variant}
                  onClick={() => setLetzteAktion(`${variant}: Standard`)}
                >
                  Brief senden
                </Button>
              </Specimen>
              <Specimen state="Mit Symbol">
                <Button
                  variant={variant}
                  iconLeft={Send}
                  onClick={() => setLetzteAktion(`${variant}: mit Symbol`)}
                >
                  Brief senden
                </Button>
              </Specimen>
              <Specimen state="Laden">
                <Button variant={variant} loading loadingLabel="Wird gesendet">
                  Brief senden
                </Button>
              </Specimen>
              <Specimen state="Deaktiviert">
                <Button variant={variant} disabled>
                  Brief senden
                </Button>
              </Specimen>
              <Specimen state="Fehler">
                <Button
                  variant={variant}
                  error="Senden hat nicht geklappt. Versuche es noch einmal."
                >
                  Brief senden
                </Button>
              </Specimen>
              <Specimen state="Volle Breite">
                <Button variant={variant} block>
                  Brief senden
                </Button>
              </Specimen>
            </SpecimenGrid>
            <p className="text-small text-muted-foreground">
              Hover, Fokus und Aktiv sind nur am Gerät sichtbar: Tabuliere durch
              die Knöpfe, um den Fokusring zu prüfen.
            </p>
          </div>
        ))}

        <div className="flex flex-col gap-4">
          <h3 className="text-subtitle">Gefahr</h3>
          <p className="max-w-prose text-body text-muted-foreground">
            Die Gefahr-Stufe verlangt ein onConfirm und führt die Aktion erst
            nach der Bestätigung im Dialog aus.
          </p>
          <SpecimenGrid>
            <Specimen state="Standard">
              <Button
                variant="danger"
                iconLeft={Trash2}
                onConfirm={() => setLetzteAktion("Gefahr: bestätigt")}
                confirmTitle="Brief endgültig löschen?"
                confirmDescription="Der Brief und alle Antworten darauf werden entfernt. Das lässt sich nicht rückgängig machen."
              >
                Brief löschen
              </Button>
            </Specimen>
            <Specimen state="Laden">
              <Button
                variant="danger"
                loading
                loadingLabel="Wird gelöscht"
                onConfirm={() => setLetzteAktion("Gefahr: bestätigt")}
              >
                Brief löschen
              </Button>
            </Specimen>
            <Specimen state="Deaktiviert">
              <Button
                variant="danger"
                disabled
                onConfirm={() => setLetzteAktion("Gefahr: bestätigt")}
              >
                Brief löschen
              </Button>
            </Specimen>
            <Specimen state="Fehler">
              <Button
                variant="danger"
                error="Löschen hat nicht geklappt."
                onConfirm={() => setLetzteAktion("Gefahr: bestätigt")}
              >
                Brief löschen
              </Button>
            </Specimen>
          </SpecimenGrid>
        </div>
      </Section>

      <Section id="karte" title="Karte">
        <SpecimenGrid>
          <Specimen state="Standard">
            <Card>
              <CardHeader>
                <CardTitle>Brief vom 3. März</CardTitle>
                <CardDescription>Vor zwei Tagen geschrieben</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-body">
                  Manchmal reicht es schon, wenn jemand zuhört.
                </p>
              </CardContent>
              <CardFooter>
                <StatusBadge status="wartet" />
              </CardFooter>
            </Card>
          </Specimen>
          <Specimen state="Anklickbar">
            <Card interactive>
              <CardHeader>
                <CardTitle>Brief vom 1. März</CardTitle>
                <CardDescription>Eine Antwort liegt bereit</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-body">
                  Ich habe lange überlegt, ob ich das schreibe.
                </p>
              </CardContent>
            </Card>
          </Specimen>
          <Specimen state="Laden">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent>
                <SkeletonText lines={3} label="Brief wird geladen" />
              </CardContent>
            </Card>
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section id="textbereich" title="Textbereich mit Zeichenzähler">
        <SpecimenGrid>
          <Specimen state="Standard">
            <Textarea
              label="Dein Brief"
              hint="Schreib so viel oder so wenig, wie du möchtest."
              maxLength={2000}
              value={brieftext}
              onValueChange={setBrieftext}
              placeholder="Was beschäftigt dich?"
            />
          </Specimen>
          <Specimen state="Fehler">
            <Textarea
              label="Dein Brief"
              maxLength={2000}
              value=""
              onValueChange={() => undefined}
              error="Bitte schreib mindestens einen Satz."
            />
          </Specimen>
          <Specimen state="Deaktiviert">
            <Textarea
              label="Dein Brief"
              maxLength={2000}
              value="Dieser Brief wurde bereits gesendet."
              onValueChange={() => undefined}
              disabled
            />
          </Specimen>
          <Specimen state="Nahe an der Grenze">
            <Textarea
              label="Kurze Antwort"
              maxLength={60}
              value={"Ich denke an dich und wünsche dir etwas Ruhe heute."}
              onValueChange={() => undefined}
            />
          </Specimen>
          <Specimen state="Laden">
            <Textarea
              label="Dein Brief"
              maxLength={2000}
              value=""
              onValueChange={() => undefined}
              loading
            />
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section id="chips" title="Kategorie-Chip">
        <SpecimenGrid>
          <Specimen state="Mehrfachauswahl">
            <CategoryChipGroup
              legend="Worum geht es?"
              hint="Du kannst mehrere auswählen."
              options={KATEGORIEN}
              selected={kategorien}
              onSelectedChange={setKategorien}
            />
          </Specimen>
          <Specimen state="Fehler">
            <CategoryChipGroup
              legend="Worum geht es?"
              options={KATEGORIEN.slice(0, 3)}
              selected={[]}
              onSelectedChange={() => undefined}
              error="Wähle mindestens eine Kategorie."
            />
          </Specimen>
          <Specimen state="Deaktiviert">
            <CategoryChipGroup
              legend="Worum geht es?"
              options={KATEGORIEN.slice(0, 3)}
              selected={["arbeit"]}
              onSelectedChange={() => undefined}
              disabled
            />
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section id="status" title="Status-Badge">
        <div className="flex flex-wrap gap-3">
          {ALL_STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </Section>

      <Section id="blasen" title="Chat-Blase">
        <div className="flex flex-col gap-6">
          <ChatBubble
            variant="original"
            author="Anonym"
            timestamp="3. März, 21:14"
          >
            <p>Ich weiß nicht, wie lange das noch so weitergeht.</p>
          </ChatBubble>
          <ChatBubble variant="fremd" author="Antwort" timestamp="4. März, 08:02">
            <p>Danke, dass du das aufgeschrieben hast.</p>
          </ChatBubble>
          <ChatBubble variant="eigen" author="Du" timestamp="4. März, 09:30">
            <p>Das zu lesen hat mir geholfen.</p>
          </ChatBubble>
          <ChatBubble
            variant="geloescht"
            author="Antwort"
            timestamp="4. März, 10:11"
          />
        </div>
      </Section>

      <Section id="offcanvas" title="Off-Canvas-Menü">
        <p className="max-w-prose text-body text-muted-foreground">
          Escape schließt das Menü, der Fokus bleibt darin gefangen und kehrt
          beim Schließen zum Auslöser zurück.
        </p>
        <div>
          <OffCanvas title="Menü" description="Navigation und Einstellungen">
            <ul className="flex flex-col gap-2">
              <li>
                <OffCanvasLink href="#" current>
                  Meine Briefe
                </OffCanvasLink>
              </li>
              <li>
                <OffCanvasLink href="#">Antworten</OffCanvasLink>
              </li>
              <li>
                <OffCanvasLink href="#">Einstellungen</OffCanvasLink>
              </li>
            </ul>
          </OffCanvas>
        </div>
      </Section>

      <Section
        id="dialoge"
        title="Dialog"
        description="Drei Varianten derselben Basis: Bestätigung, Meldung und Krise."
      >
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={oeffneDialog("confirm")}>
            Bestätigung zeigen
          </Button>
          <Button variant="secondary" onClick={oeffneDialog("notice")}>
            Meldung zeigen
          </Button>
          <Button variant="secondary" onClick={oeffneDialog("crisis")}>
            Krise zeigen
          </Button>
        </div>

        <AppDialog
          variant="confirm"
          destructive
          open={offenerDialog === "confirm"}
          returnFocusRef={dialogAusloeser}
          onOpenChange={(open) => setOffenerDialog(open ?"confirm" : null)}
          title="Brief endgültig löschen?"
          description="Der Brief und alle Antworten darauf werden entfernt. Das lässt sich nicht rückgängig machen."
          onConfirm={() => setLetzteAktion("Dialog: Löschen bestätigt")}
        />

        <AppDialog
          variant="notice"
          open={offenerDialog === "notice"}
          returnFocusRef={dialogAusloeser}
          onOpenChange={(open) => setOffenerDialog(open ?"notice" : null)}
          title="Dein Brief ist unterwegs"
          description="Sobald jemand antwortet, findest du die Antwort unter deinen Briefen."
        />

        <AppDialog
          variant="crisis"
          open={offenerDialog === "crisis"}
          returnFocusRef={dialogAusloeser}
          onOpenChange={(open) => setOffenerDialog(open ?"crisis" : null)}
          title="Wenn es gerade sehr schwer ist"
          description="Es gibt Menschen, die rund um die Uhr erreichbar sind und zuhören. Du musst das nicht allein tragen."
          dismissLabel="Verstanden"
        />
      </Section>

      <Section id="leerzustand" title="Leerzustand">
        <EmptyState
          title="Noch keine Briefe"
          description="Sobald du deinen ersten Brief schreibst, erscheint er hier."
          action={<Button variant="primary">Ersten Brief schreiben</Button>}
        />
      </Section>

      <Section
        id="ladezustand"
        title="Ladezustand"
        description="Skeleton statt Spinner. Bewusst ohne Dauerbewegung."
      >
        <SpecimenGrid>
          <Specimen state="Textblock">
            <SkeletonText lines={4} />
          </Specimen>
          <Specimen state="Einzelfläche">
            <Skeleton className="h-16 w-full" />
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section id="fehlerzustand" title="Fehlerzustand">
        <SpecimenGrid>
          <Specimen state="Standard">
            <ErrorState
              onRetry={() => setLetzteAktion("Fehlerzustand: erneut versucht")}
            />
          </Specimen>
          <Specimen state="Wird wiederholt">
            <ErrorState onRetry={() => undefined} retrying />
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section id="banner" title="Hinweisbanner">
        <div className="flex flex-col gap-4">
          <NoticeBanner tone="hinweis" title="Dein Brief bleibt anonym">
            <p>Wir speichern keine Namen und keine Adressen.</p>
          </NoticeBanner>
          <NoticeBanner tone="warnung" title="Diese Antwort wird geprüft">
            <p>Sie erscheint erst, wenn die Prüfung abgeschlossen ist.</p>
          </NoticeBanner>
          <NoticeBanner tone="hilfe" title="Hilfe in einer akuten Krise">
            <p>Die Telefonseelsorge ist rund um die Uhr erreichbar.</p>
          </NoticeBanner>
          {bannerSichtbar ? (
            <NoticeBanner
              tone="hinweis"
              title="Schließbares Banner"
              onDismiss={() => setBannerSichtbar(false)}
            >
              <p>Dieses Banner lässt sich wegklicken.</p>
            </NoticeBanner>
          ) : (
            <Button variant="tertiary" onClick={() => setBannerSichtbar(true)}>
              Banner zurückholen
            </Button>
          )}
        </div>
      </Section>

      <Section id="kopierfeld" title="Kopierbares Feld">
        <SpecimenGrid>
          <Specimen state="Standard">
            <CopyField
              label="Deine Anomail-ID"
              hint="Bewahre sie auf. Ohne sie kommst du nicht an deine Briefe."
              value="ANO-7K42-9QX1"
            />
          </Specimen>
          <Specimen state="Deaktiviert">
            <CopyField label="Deine Anomail-ID" value="ANO-7K42-9QX1" disabled />
          </Specimen>
          <Specimen state="Laden">
            <CopyField label="Deine Anomail-ID" value="" loading />
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section id="umschalter" title="Umschalter">
        <SpecimenGrid>
          <Specimen state="Standard">
            <ToggleSwitch
              label="Benachrichtigungen"
              description="Wir sagen dir Bescheid, wenn eine Antwort da ist."
              checked={benachrichtigungen}
              onCheckedChange={setBenachrichtigungen}
            />
          </Specimen>
          <Specimen state="Deaktiviert">
            <ToggleSwitch
              label="Benachrichtigungen"
              description="In dieser Ansicht nicht änderbar."
              checked={false}
              onCheckedChange={() => undefined}
              disabled
            />
          </Specimen>
          <Specimen state="Fehler">
            <ToggleSwitch
              label="Benachrichtigungen"
              checked={false}
              onCheckedChange={() => undefined}
              error="Die Einstellung konnte nicht gespeichert werden."
            />
          </Specimen>
          <Specimen state="Laden">
            <ToggleSwitch
              label="Benachrichtigungen"
              checked={false}
              onCheckedChange={() => undefined}
              loading
            />
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section id="symbole" title="Symbole">
        <p className="max-w-prose text-body text-muted-foreground">
          Lucide, 20px, Strichstärke 1.75, immer currentColor und immer
          aria-hidden. Ein Symbol steht nie allein: daneben gehört sichtbarer
          Text oder Text für Screenreader.
        </p>
        <div className="flex flex-wrap gap-6">
          <Button variant="secondary" iconLeft={Bell}>
            Mit Beschriftung
          </Button>
        </div>
      </Section>
    </div>
  );
}
