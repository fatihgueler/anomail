/**
 * Platzhalter-Startseite.
 *
 * Arbeitspaket 1 baut nur das Grundgeruest. Die eigentlichen Routen entstehen
 * in spaeteren Paketen. Diese Seite existiert nur, damit die Anwendung startet.
 */
export default function HomePage() {
  return (
    <main id="hauptinhalt" className="mx-auto flex max-w-shell flex-col gap-4 p-8">
      <h1 className="text-display">Anomail</h1>
      <p className="max-w-prose text-body text-muted-foreground">
        Das Grundgerüst steht. Fachliche Seiten folgen in den nächsten
        Arbeitspaketen.
      </p>
      {process.env.NODE_ENV === "development" ? (
        <p className="text-body">
          <a
            href="/dev/ui"
            className="focus-ring rounded-md text-primary underline underline-offset-4"
          >
            Zur Komponenten-Übersicht
          </a>
        </p>
      ) : null}
    </main>
  );
}
