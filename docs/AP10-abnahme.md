# AP10 — Barrierefreiheit und Kontrast: Abnahmebericht

Prüf- und Korrekturpaket über die gesamte Anwendung. Kein Feature wurde
hinzugefügt, das kein Kriterium verletzt hat. Keine Prüfung wurde gelockert,
damit sie besteht. Der beige Seitenhintergrund (`--background`) ist unverändert.

Stand: 20. August 2026.

---

## 1. Geprüfte Routen

34 Routen, je in beiden Helligkeiten. Die Tabelle in
[`tests/e2e/routen.ts`](../tests/e2e/routen.ts) ist die einzige Stelle, an der
steht, was geprüft wird; ein Vollständigkeitstest schlägt fehl, sobald eine neue
Route dort fehlt.

| Route | Sitzung | axe | Zoom 200 % | 320 px | Ziele ≥ 44 px | Fokusring | Sprunglinie |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | anonym | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/login` | anonym | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/login/check` | anonym | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/login/error` | anonym | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/help` | anonym | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/contact` | anonym | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/impressum` | anonym | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/privacy` | anonym | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/privacy/vollstaendig` | anonym | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/terms` | anonym | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/agb` | anonym | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 404-Seite | anonym | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/write` | angemeldet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/sent` | angemeldet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/listen` | angemeldet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/response-sent` | angemeldet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/my-letters` | angemeldet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/conversation/:id` | angemeldet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/notifications` | angemeldet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/my-reports` | angemeldet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/blocked` | angemeldet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/settings` | angemeldet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/anomail-id` | angemeldet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/delete-account` | angemeldet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/account-geloescht` | anonym | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/suspended` | angemeldet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/moderation` | Moderation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/moderation/reports` | Moderation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/moderation/safety` | Moderation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/moderation/letters` | Moderation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/moderation/responses` | Moderation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/moderation/appeals` | Moderation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/moderation/audit` | Moderation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/dev/ui`, `/dev/legal` | intern | **nicht geprüft** | — | — | — | — | — |

Zu den beiden letzten siehe Abschnitt 6, offener Punkt 1.

---

## 2. Kontrast

36 registrierte Kombinationen, je hell und dunkel, gerechnet aus denselben
Token-Werten wie `app/globals.css`. Neu erzeugbar mit
`npx tsx scripts/kontrasttabelle.mts`.

| Verwendung | Kombination | Anforderung | Hell | Dunkel |
| --- | --- | --- | --- | --- |
| Fliesstext auf Seitenhintergrund | `foreground` auf `background` | 4,5:1 | 10,18:1 | 15,24:1 |
| Metadaten auf Seitenhintergrund | `muted-foreground` auf `background` | 4,5:1 | 4,83:1 | 8,96:1 |
| Fliesstext auf Karte | `card-foreground` auf `card` | 4,5:1 | 16,55:1 | 13,51:1 |
| Metadaten auf Karte | `muted-foreground` auf `card` | 4,5:1 | 7,86:1 | 7,94:1 |
| Primär-Button, Schrift auf Fläche | `primary-foreground` auf `primary` | 4,5:1 | 7,85:1 | 7,61:1 |
| Sekundär-Button, Schrift auf Seitenhintergrund | `primary` auf `background` | 4,5:1 | 4,83:1 | 7,23:1 |
| Sekundär-Button, Schrift auf Karte | `primary` auf `card` | 4,5:1 | 7,85:1 | 6,41:1 |
| Gefahr-Button, Schrift auf Seitenhintergrund | `destructive` auf `background` | 4,5:1 | 4,76:1 | 6,45:1 |
| Gefahr-Button, Schrift auf Karte | `destructive` auf `card` | 4,5:1 | 7,75:1 | 5,72:1 |
| Primär-Button beim Hovern | `primary-foreground` auf `primary-hover` | 4,5:1 | 9,86:1 | 8,94:1 |
| Primär-Button beim Drücken | `primary-foreground` auf `primary-active` | 4,5:1 | 12,00:1 | 11,26:1 |
| Sekundär-Button beim Hovern | `primary-hover` auf `secondary` | 4,5:1 | 7,78:1 | 6,05:1 |
| Gefahr-Button beim Hovern | `destructive-hover` auf `secondary` | 4,5:1 | 7,90:1 | 5,87:1 |
| Deaktivierter Button | `muted-foreground` auf `muted` | 4,5:1 | 6,43:1 | 6,88:1 |
| Schrift auf Sekundärfläche | `secondary-foreground` auf `secondary` | 4,5:1 | 13,06:1 | 10,84:1 |
| Metadaten auf Sekundärfläche | `muted-foreground` auf `secondary` | 4,5:1 | 6,20:1 | 6,37:1 |
| Schrift auf gedämpfter Fläche | `foreground` auf `muted` | 4,5:1 | 13,54:1 | 11,71:1 |
| Metadaten auf gedämpfter Fläche, gelöschte Nachricht | `muted-foreground` auf `muted` | 4,5:1 | 6,43:1 | 6,88:1 |
| Status zurückgehalten | `destructive` auf `muted` | 4,5:1 | 6,34:1 | 4,95:1 |
| Status beantwortet | `accent-foreground` auf `accent` | 4,5:1 | 7,24:1 | 6,08:1 |
| Status in Bearbeitung | `primary` auf `secondary` | 4,5:1 | 6,19:1 | 5,14:1 |
| Eingabefeld-Rahmen gegen Seitenhintergrund | `input` auf `background` | 3,0:1 | 3,28:1 | 4,04:1 |
| Eingabefeld-Rahmen gegen Karte | `input` auf `card` | 3,0:1 | 5,34:1 | 3,58:1 |
| Fokusring gegen Seitenhintergrund | `ring` auf `background` | 3,0:1 | 4,83:1 | 7,23:1 |
| Fokusring gegen Karte | `ring` auf `card` | 3,0:1 | 7,85:1 | 6,41:1 |
| Primärfläche gegen Seitenhintergrund | `primary` auf `background` | 3,0:1 | 4,83:1 | 7,23:1 |
| Umschalter und Filterknöpfe | `foreground` auf `secondary` | 4,5:1 | 13,06:1 | 10,84:1 |
| Fliesstext auf Karte über die Vordergrundfarbe | `foreground` auf `card` | 4,5:1 | 16,55:1 | 13,51:1 |
| Zitierter fremder Inhalt in der Moderation | `secondary-foreground` auf `secondary` | 4,5:1 | 13,06:1 | 10,84:1 |
| Gefahr-Aktion in der Moderation | `destructive` auf `secondary` | 4,5:1 | 6,11:1 | **4,59:1** |
| Status in Bearbeitung auf gedämpfter Fläche | `primary` auf `muted` | 4,5:1 | 6,42:1 | 5,55:1 |
| Kartentext auf gedämpfter Fläche | `card-foreground` auf `muted` | 4,5:1 | 13,54:1 | 11,71:1 |
| Risikostufe Krise | `destructive-foreground` auf `destructive` | 4,5:1 | 7,75:1 | 6,17:1 |
| Platzhalter der Rechtstexte | `destructive` auf `muted` | 4,5:1 | 6,34:1 | 4,95:1 |
| Akzentbalken am Ursprungsbrief (zierend) | `accent` auf `secondary` | 1,0:1 | 1,80:1 | 4,52:1 |
| Zierlinie zwischen Abschnitten (zierend) | `border` auf `card` | 1,0:1 | 1,84:1 | 1,58:1 |

**36 von 36 bestanden, in beiden Helligkeiten.**

### Zwei Einträge, die eine Erklärung brauchen

**Der Akzentbalken und die Zierlinie** sind als `decorative` eingestuft
(Schwelle 1,0:1). Das ist keine Ausnahme, um eine Prüfung zu bestehen, sondern
die Feststellung, dass beide keine Information tragen: Der Akzentbalken markiert
den Ursprungsbrief, der daneben ausdrücklich als *Ursprungsbrief* beschriftet
ist; die Zierlinie trennt Abschnitte, die durch Überschriften und Abstand ohnehin
getrennt sind. Beide Werte stehen trotzdem in der Tabelle und werden bei jedem
Lauf mitgerechnet — verschwiegen wird nichts. Wer künftig ein Element dort
einträgt, muss die Redundanz im Text nachweisen; `lib/tokens/contrast.ts` sagt
das an Ort und Stelle.

**Die Gefahr-Aktion in der Moderation** war der einzige echte Kontrastverstoß
dieses Pakets: dunkles `--destructive` auf `--secondary` ergab 4,43:1. Korrigiert
wurde an der Token-Definition (Helligkeit 70 % → 71 %), nicht per Ausnahme und
nicht mit einer Sonderregel auf der Moderationsseite. Alle übrigen
Kombinationen mit `--destructive` sind dadurch ebenfalls minimal gestiegen und
bleiben bestanden.

---

## 3. Behobene Befunde

| # | Befund | Kriterium | Korrektur |
| --- | --- | --- | --- |
| 1 | `--destructive` dunkel auf `--secondary` erreichte 4,43:1 | 1.4.3 (AA) | Token auf 71 % Helligkeit angehoben, `app/globals.css` |
| 2 | Keine Sprunglinie; Tastaturnutzung erzwang die Navigation auf jeder Seite | 2.4.1 (A) | `components/ui/skip-link.tsx`, im Wurzel-Layout als erster Haltepunkt |
| 3 | Kein Sprungziel — 27 `<main>` ohne ID | 2.4.1 (A) | `id="hauptinhalt"` auf jeder Seite |
| 4 | Ladezustand der Moderation ohne `<main>`: während des Ladens fehlte die Hauptbereichs-Landmarke, das Sprungziel ging ins Leere | 1.3.1, 2.4.1 (A) | Landmarke ins Moderations-Layout verlegt, das den Streaming-Wechsel überdauert; Seiten und `loading.tsx` tragen keine eigene mehr |
| 5 | 404-Seite auf Englisch (Next.js-Vorgabe) | 3.1.1 (A) | `app/not-found.tsx` auf Deutsch |
| 6 | Kein Manifest, keine Symbole; Leistenfarbe nicht definiert | — (Altbestand-Mangel) | `app/manifest.ts`, `lib/tokens/theme-color.ts`, drei erzeugte Symbole inkl. eigenem `maskable` |
| 7 | Seitentitel doppelten den Dienstnamen: „Meine Briefe — Anomail — Anomail" | 2.4.2 (A) | Zusatz aus 22 Seitentiteln entfernt; die Vorlage im Wurzel-Layout hängt ihn genau einmal an |
| 8 | Lange deutsche Komposita brachen nicht; einzelne Wörter schoben die Seite auf 320 px waagerecht auf (`/notifications`, `/privacy/vollstaendig`, `/agb`) | 1.4.10 (AA) | `hyphens: auto` und `overflow-wrap: break-word` global auf `body` |
| 9 | Button-Beschriftung lief über den rechten Rand hinaus (`/settings`) | 1.4.10 (AA) | `max-w-full text-center` und `min-h-control` statt fester Höhe in `button-variants.ts` |
| 10 | Das Kopierfeld schrumpfte nicht: `flex-1` mit `min-width: auto` (`/anomail-id`) | 1.4.10 (AA) | `min-w-0` am Feld, `shrink-0` am Knopf |

Nicht als Befund gezählt, aber im selben Zug korrigiert: `/dev/ui` hatte keinen
Seitentitel, und die Entwicklungsdatenbank kannte keine Moderationsdaten — die
Moderationsseiten wären sonst nur als Leerzustand geprüft worden.

---

## 4. Bleistifttest (Graustufen und Unschärfe)

Jede Hauptseite in Graustufe mit 1,5 px Unschärfe betrachtet. Die Frage: Bleibt
die Rangfolge erkennbar, wenn die Farbe wegfällt?

| Seite | Ergebnis |
| --- | --- |
| `/` Startseite | Bestanden. Titel dominiert, Beschreibung zweite Ebene, Krisenhinweis abgesetzt. |
| `/write` | Bestanden. Überschrift, Einleitung, Warnkarte und Formular bilden vier unterscheidbare Ebenen; die Karte trennt sich durch Fläche und Rahmen, nicht durch Farbe. |
| `/listen` | Bestanden. Leerzustand mit Symbol, fetter Kernaussage und leichterem Nachsatz. |
| `/my-letters` | Bestanden. Status („Wartet", „Beantwortet") steht als Wort da, nicht nur als Farbe. |
| `/conversation/:id` | Bestanden. Eigene und fremde Nachrichten unterscheiden sich durch Ausrichtung und Fläche. |
| `/settings` | Bestanden. Schalterstellung ist an der Position des Knopfes ablesbar. |
| `/moderation/reports` | Bestanden. Risikostufen tragen Text, die Tabelle bleibt über Zeilenstruktur lesbar. |

Zusätzlich als dauerhafte Regel festgehalten: Kein Link im Fließtext hebt sich
allein durch Farbe ab (WCAG 1.4.1, Stufe A). axe prüft das nicht — die Regel
steht jetzt in `tests/e2e/bedienung.spec.ts` und gilt für alle 33 Routen.

---

## 5. Dauerhafte Prüfung statt einmaliger Durchsicht

Alles Geprüfte ist als Test abgelegt und läuft bei jedem Push und jedem Pull
Request ([`.github/workflows/pruefung.yml`](../.github/workflows/pruefung.yml),
drei Jobs).

### Ohne Browser — `npm run test:a11y` (111 Tests)

| Datei | Tests | Prüft |
| --- | --- | --- |
| `tests/a11y/contrast.test.ts` | 84 | Jede Kombination in beiden Helligkeiten; Verbot hartkodierter Farben (hex, rgb, hsl, oklch, Verläufe, Schatten); Vollständigkeit — jedes benutzte Text- und Flächen-Token muss in einem Paar vorkommen |
| `tests/a11y/sprache.test.ts` | 18 | Wortverbote, Satzbauregeln, keine englischen Oberflächenwörter, Wortlaut der Krisenhinweise |
| `tests/a11y/landmarken.test.ts` | 5 | Genau eine Hauptbereichs-Landmarke je Seite, auch über Layouts und die Rechtstext-Hülle hinweg |
| `tests/a11y/titel.test.ts` | 4 | Jede Seite hat einen Titel, keiner wiederholt den Dienstnamen |

### Mit Browser — `npm run test:axe` (418 Tests, beide Helligkeiten)

| Datei | Prüft |
| --- | --- |
| `tests/e2e/axe.spec.ts` | axe-core mit `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` über jede Route. Keine Regel abgeschaltet. Vollständigkeitstest über die Routentabelle. |
| `tests/e2e/bedienung.spec.ts` | Zoom 200 %, Breite 320 px, Zielgrößen, Fokusring, Sprunglinie, Links im Fließtext |
| `tests/e2e/dialog.spec.ts` | Fokus geht in den Dialog, bleibt darin, kehrt zum Auslöser zurück; `aria-modal` gesetzt |
| `tests/e2e/manifest.spec.ts` | Manifest erreichbar, Symbole sind echte PNG, Leistenfarbe stimmt mit dem gemessenen Hintergrund überein, Zoom nicht gesperrt |

### Prüfungen, die sich selbst prüfen

Vier Stellen sind eingebaut, damit kein Test aus dem falschen Grund besteht:

- **axe** schlägt fehl, wenn es keine einzige Regel anwenden konnte. Eine leere
  Seite hat keine Verstöße und bestünde sonst.
- **Die Zielmessung** zählt Pseudoelemente und zugehörige Labels mit — das ist
  die WCAG-Definition, nicht eine Lockerung. Ein eigener Test schiebt ein
  absichtlich 20 × 20 Pixel großes Ziel in die Seite und verlangt, dass es
  gemeldet wird.
- **Der Farbmodus** wird vor jeder Messung bestätigt. Ohne das hätte ein
  Durchgang namens „dunkel" die helle Oberfläche prüfen können — beim Bau dieses
  Berichts ist genau das einmal passiert.
- **Der Sprachtest** weist nach, dass sein Textauszug überhaupt Text findet,
  bevor er Verbote darauf anwendet.

---

## 6. Offene Punkte

**1. `/dev/ui` und `/dev/legal` sind nicht durch axe geprüft.**
Beide rufen `notFound()`, sobald `NODE_ENV` nicht `development` ist, und
existieren im Produktionsbau nicht. Die Suite prüft dort stattdessen, dass die
Sperre hält (404). Eine axe-Prüfung wäre nur gegen den Entwicklungsserver
möglich, und der blendet eigene Einblendungen ein, die es im Betrieb nicht gibt.
Da beide Seiten nicht ausgeliefert werden, ist das aus meiner Sicht vertretbar —
die Entscheidung liegt aber bei dir.

**2. Es gibt keine seitenübergreifende Navigation und keine Fußzeile.**
`/my-letters` etwa enthält außer dem Link ins Gespräch keinen Weg an eine andere
Stelle der Anwendung; zurück geht es nur über den Browser. WCAG 2.4.5
(*Mehrere Wege*, Stufe AA) verlangt mehr als einen Weg, eine Seite innerhalb
eines Seitensatzes zu finden — ausgenommen Seiten, die Schritt eines Vorgangs
sind. Für `/write → /sent` greift die Ausnahme, für `/my-letters`,
`/notifications`, `/settings`, `/blocked` und `/my-reports` nicht.

Das ist kein Kontrast- oder Auszeichnungsfehler, sondern eine fehlende
Komponente, die alle bisherigen Pakete betrifft. Eine Navigationsleiste zu bauen
wäre ein Feature, und AP10 ist ausdrücklich kein Feature-Paket — deshalb habe ich
es nicht getan, sondern melde es. Auch der Krisenhinweis („Anomail ist kein
Krisendienst") erscheint dadurch nur auf einzelnen Seiten statt durchgehend.

**3. `whitespace-nowrap` am Löschen-Knopf in `app/delete-account/delete-form.tsx`.**
Kein Verstoß — die Beschriftung passt auch auf 320 px. Die Klasse verhindert
aber genau den Umbruch, der die Befunde 8 bis 10 verursacht hat. Bei einer
längeren Beschriftung wäre der Querlauf zurück. Ich habe sie stehen lassen, weil
kein Kriterium verletzt ist.

**4. Die Rechtstexte sind unverändert.**
Die 26 Platzhalter aus AP9 stehen weiterhin offen; AP10 hat sie ausdrücklich
nicht angefasst. Der Sprachtest nimmt `app/privacy`, `app/terms`, `app/agb`,
`app/impressum`, `app/help`, `app/contact` und `content/legal` aus — für axe,
Kontrast, Zoom und Tastatur gelten sie dagegen wie jede andere Seite und
bestehen.

---

## 7. Läufe zu diesem Bericht

| Lauf | Ergebnis |
| --- | --- |
| `npx tsc --noEmit` | ohne Befund |
| `npx vitest run` | 258 Tests, 17 Dateien, alle bestanden |
| `npx playwright test` | 418 Tests in beiden Helligkeiten, alle bestanden |
| `npm run build` | erfolgreich, 34 Routen erzeugt |
| `npx tsx scripts/kontrasttabelle.mts` | 36 Paare, 0 durchgefallen |

Voraussetzung für die Browser-Läufe: `npx tsx scripts/local-dev-db.mts` läuft
und hat `.env.local` geschrieben.
