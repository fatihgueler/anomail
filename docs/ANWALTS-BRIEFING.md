# Anomail — Briefing für die rechtliche Prüfung

Dieses Dokument beschreibt, **was die Anwendung technisch tut**, damit die
Rechtstexte auf Tatsachen beruhen statt auf Annahmen. Es ersetzt keine
rechtliche Prüfung und trifft bewusst keine rechtlichen Aussagen.

Am Ende steht die Liste der 31 Textstellen, die noch gefüllt werden müssen,
jeweils mit Fundort in der Anwendung.

Stand: 20. August 2026.

---

## 1. Was der Dienst ist

Jemand schreibt anonym einen Brief über etwas, das ihn belastet. Genau **eine**
andere Person bekommt diesen Brief zugeteilt, liest ihn und antwortet. Beide
sehen voneinander ausschließlich eine zufällige Kennung im Format
`AN-XXXX-XXXX`.

Aus Brief und Antwort kann ein fortlaufender Briefwechsel werden. Es gibt
keine Profile, keine Freundeslisten, keine Reichweite, keine Bewertungen und
keine öffentlichen Inhalte.

**Der Dienst ist ausdrücklich kein Krisen-, Notfall- oder Therapiedienst.**
Dieser Hinweis steht auf der Startseite, in der Fußzeile jeder Seite und als
Dialog vor dem Absenden eines Briefs, wenn die Inhaltsprüfung anschlägt.

---

## 2. Welche personenbezogenen Daten anfallen

### 2.1 Bei der Anmeldung

| Datum | Zweck | Sichtbarkeit |
| --- | --- | --- |
| E-Mail-Adresse | einziges Anmeldemerkmal, Versand des Anmeldelinks | **nur Betreiber**. Anderen Nutzern nie. Auch der Moderation nicht. |
| Anomail-ID | Kennung nach außen | allen Beteiligten eines Briefwechsels |
| Zeitpunkt der Registrierung | — | niemandem |

Es gibt **kein Passwort**. Die Anmeldung läuft ausschließlich über einen
einmaligen Link per E-Mail, gültig 15 Minuten.

Die Anomail-ID wird bei der ersten Anmeldung einmal zufällig vergeben und ist
danach unveränderlich. Sie hängt technisch nicht an der E-Mail-Adresse und
lässt sich aus ihr nicht ableiten.

### 2.2 Inhalte

| Datum | Anmerkung |
| --- | --- |
| Brieftexte | 80 bis 4000 Zeichen, frei geschrieben |
| Antworten und Folgenachrichten | ebenso |
| Themenzuordnung | acht feste Kategorien, vom Schreibenden gewählt |
| Zeitstempel | je Brief und Nachricht |

Nutzer werden vor dem Schreiben ausdrücklich gebeten, keine Namen, Adressen
oder andere identifizierende Angaben zu machen — weder über sich noch über
Dritte. Erzwingen lässt sich das nicht. **Es ist deshalb damit zu rechnen,
dass Brieftexte besondere Kategorien personenbezogener Daten nach Art. 9
DSGVO enthalten** (Gesundheit, Sexualleben, religiöse oder weltanschauliche
Überzeugungen), da genau darüber geschrieben wird.

### 2.3 Sicherheit und Moderation

| Datum | Zweck |
| --- | --- |
| Meldungen | Meldender, gemeldeter Inhalt, Grund, Bearbeitungsstand |
| Blockierungen | wer wen blockiert hat |
| Ergebnisse der Inhaltsprüfung | Risikostufe, erkannte Kategorien, Textkopie zum Zeitpunkt der Prüfung |
| Moderationsprotokoll | wer wann welchen fremden Inhalt gesehen oder bearbeitet hat |
| Widersprüche | Text des Widerspruchs, Entscheidung, Begründung |

Das Moderationsprotokoll ist **technisch unveränderlich**: Datenbankrechte und
ein Trigger verhindern Änderung und Löschung, auch durch den Eigentümer der
Datenbank.

### 2.4 Technisches

| Datum | Anmerkung |
| --- | --- |
| Sitzungen | Sitzungskennung, Ablaufzeitpunkt, in der Datenbank |
| Ratenbegrenzung | gehashte Kennungen aus E-Mail-Adresse und IP-Adresse |
| Serverprotokolle | beim Hoster |

**Es gibt keine Cookies außer dem Sitzungscookie.** Kein Tracking, keine
Analyse, keine Einbindung Dritter, kein Einwilligungsbanner. Schriften werden
selbst ausgeliefert, nicht von einem fremden Server nachgeladen.

**Zur IP-Adresse:** Sie wird für die Ratenbegrenzung der Anmeldung
verwendet — gehasht, nicht im Klartext gespeichert. Ob und wie lange der
Hoster darüber hinaus Serverprotokolle führt, ist eine Frage an den Hoster
(siehe Abschnitt 5).

---

## 3. Wer was sehen kann

Diese Grenzen sind nicht nur in der Oberfläche gezogen, sondern in der
Datenbank selbst (Row Level Security). Ein Fehler im Anwendungscode kann sie
nicht aushebeln.

| Rolle | Sieht |
| --- | --- |
| Nutzer | ausschließlich eigene Briefe und Briefwechsel, an denen er beteiligt ist |
| Moderation | gemeldete und zurückgehaltene Inhalte im Klartext — **ohne E-Mail-Adressen**. Jeder Zugriff wird protokolliert. |
| Admin | zusätzlich das Moderationsprotokoll |

Die Moderation kann Nutzer **nicht** direkt kontaktieren und **nicht** frei in
fremden Inhalten stöbern. Sie sieht nur, was gemeldet oder von der
Inhaltsprüfung zurückgehalten wurde.

---

## 4. Löschen

Vier Stufen, alle vom Nutzer selbst auslösbar:

| Stufe | Wirkung |
| --- | --- |
| Wartenden Brief zurückziehen | Brief verschwindet, solange er niemandem zugeteilt ist |
| Einzelne Nachricht löschen | Inhalt wird geleert; der Gegenseite bleibt sichtbar, dass dort etwas stand |
| Briefwechsel ausblenden | verschwindet aus der eigenen Übersicht; die Gegenseite behält ihre Seite |
| Konto löschen | sofort, ohne Wartezeit, Bestätigung durch Abtippen der eigenen Anomail-ID |

**Beim Löschen des Kontos** werden E-Mail-Adresse, Anmeldedaten und
Einstellungen entfernt, die Nachrichten geleert und die Anomail-ID dauerhaft
zurückgezogen — sie wird nie wieder vergeben.

**Was bewusst bleibt:** Der Briefwechsel als solcher verschwindet für die
andere Person nicht. Sie sieht weiterhin, dass ein Austausch stattgefunden
hat, aber keine Inhalte der gelöschten Seite mehr. Begründung: Sonst könnte
jemand einen Briefwechsel nachträglich aus der Erinnerung einer anderen
Person entfernen. **Diese Abwägung gehört geprüft** (Art. 17 Abs. 3 DSGVO).

Ebenfalls erhalten bleiben Einträge im Moderationsprotokoll und in
Meldungsvorgängen, soweit sie zur Nachweisführung nach DSA gebraucht werden.
**Auch das gehört geprüft.**

Eine **Datenauskunft nach Art. 15 DSGVO** kann jeder Nutzer selbst als Datei
herunterladen, ohne Anfrage beim Betreiber.

---

## 5. Auftragsverarbeiter — hier fehlen Entscheidungen

Drei Stellen, an denen Daten an Dritte gehen. **Für jede fehlt noch die
Entscheidung, wer es wird**, und damit auch die Angabe im Text.

| Wofür | Was übermittelt wird | Stand |
| --- | --- | --- |
| Hosting und Datenbank | alles | derzeit Railway (US-Anbieter). Für den Betrieb zu entscheiden. |
| Mailversand | E-Mail-Adresse, Anmeldelink | **noch nicht eingerichtet** |
| Inhaltsprüfung | Brieftext im Klartext | derzeit regelbasiert **ohne** fremden Dienst |

Die dritte Zeile ist die heikelste: Wird die Inhaltsprüfung auf ein
Sprachmodell umgestellt, verlässt jeder Brieftext den eigenen Bereich — und
Brieftexte enthalten mutmaßlich Daten nach Art. 9 DSGVO. Solange
`SAFETY_PROVIDER=rules` gesetzt ist, passiert das nicht.

**Für jeden gewählten Anbieter werden gebraucht:** Name, Sitz,
Vertragsgrundlage (AV-Vertrag), bei Drittlandbezug die Garantien nach
Art. 44 ff. DSGVO.

---

## 6. Punkte, die eine Entscheidung brauchen

1. **Mindestalter.** Die Anwendung prüft derzeit **kein** Alter. Es gibt keine
   Abfrage und keine Verifizierung. Zu klären: Welches Mindestalter gilt
   (Art. 8 DSGVO), und wie wird es geprüft? Ein Dienst über seelische
   Belastung dürfte Minderjährige anziehen.

2. **Art. 9 DSGVO.** Brieftexte enthalten mutmaßlich Gesundheitsdaten. Auf
   welcher Grundlage werden sie verarbeitet — ausdrückliche Einwilligung nach
   Art. 9 Abs. 2 lit. a? Wenn ja: Wo wird sie eingeholt, und wie wird sie
   nachgewiesen?

3. **Rechtsgrundlage je Verarbeitung** (Art. 6). Anmeldung, Inhalte,
   Zustellung, Moderation, Sicherheit — jeweils getrennt.

4. **Speicherdauer je Datenart.** Die Anwendung löscht derzeit nichts
   automatisch außer abgelaufenen Sitzungen und Zuweisungen. Briefe und
   Nachrichten bleiben, bis jemand sie löscht.

5. **Automatisierte Entscheidung** (Art. 22). Die Inhaltsprüfung kann einen
   Brief zurückhalten, bevor ein Mensch ihn sieht. Ist das eine automatisierte
   Entscheidung im Sinne des Art. 22, und wenn ja, welche Rechte folgen daraus?

6. **DSA.** Die Anwendung setzt Meldeverfahren (Art. 16), Begründungspflicht
   (Art. 17) und internes Beschwerdeverfahren (Art. 20) technisch bereits um.
   Zu prüfen: Greifen die Pflichten für diesen Dienst überhaupt, sind die
   Fristen richtig, und fehlt etwas?

7. **Zuständige Aufsichtsbehörde** — richtet sich nach dem Sitz des
   Betreibers.

8. **Verbraucherschlichtung** nach § 36 VSBG.

9. **Impressum.** Hinweis an die Umsetzung: Der Code verwendet bewusst
   **nicht** § 5 TMG, sondern verweist auf das DDG. Der Haftungstext ist auf
   den aktuellen Wortlaut abzugleichen.

---

## 7. Was konkret gebraucht wird

31 Stellen. Sie sind im Code registriert; jede zeigt derzeit sichtbar
`[ANWALTLICH ZU PRÜFEN: …]` an. Eine vollständige Übersicht mit Fundort
erzeugt die Anwendung selbst unter `/dev/legal`.

### Betreiberangaben — sieben Felder

Name, ladungsfähige Anschrift, Kontakt-E-Mail, Verantwortlicher nach
§ 18 Abs. 2 MStV, Rechtsform, Register und Registernummer,
Umsatzsteuer-Identifikationsnummer.

*Diese kommen vom Betreiber, nicht von der Kanzlei.*

### Impressum — zwei Texte

Haftungstext auf DDG-Wortlaut, Angabe zur Verbraucherschlichtung.

### Datenschutz, Kurzfassung — neun Karten

Jeweils ein verständlicher Absatz:

1. Welche Daten die App benötigt
2. Warum eine dauerhafte Nutzeridentität nötig ist
3. Warum Briefe und Antworten gespeichert werden
4. Wie Anomail-ID und interne Identität zusammenhängen
5. Deine Anomail-ID ist anonym
6. Wie Meldungen und Moderation funktionieren
7. Welche Daten du löschen kannst
8. Wie du dein Konto löschst
9. Technische Sicherheitsdaten

> Zu Karte 1 und 9: Der Altbestand sprach von einer „Geräte-Kennung". Eine
> solche gibt es nicht und hat es nie gegeben. Die Formulierung muss ohne sie
> auskommen.

### Datenschutz, Langfassung — acht Abschnitte

Rechtsgrundlagen (Art. 6), Speicherdauer je Datenart, Auftragsverarbeiter
(Hosting, Mail, Inhaltsprüfung), Drittlandtransfer, Aufsichtsbehörde,
Mindestalter (Art. 8), automatisierte Entscheidung (Art. 22).

### Nutzungsbedingungen — vier Abschnitte

Vertragsgegenstand, Vertragsschluss, Nutzerpflichten, Kündigung und
Kontolöschung.

### Nutzungsregeln — neun Regeln

Neun Verhaltensregeln in der Sprache des Dienstes (Du-Form, ruhig, ohne
Drohgebärde).

### Kontaktseite — ein Text

Wie und wofür der Betreiber erreichbar ist.

---

## 8. Sprachliche Rahmenbedingungen

Falls die Texte gleich in der Stimme des Dienstes geschrieben werden sollen:

- Durchgehend **Du-Form**.
- Ruhig und sachlich. Keine Ausrufezeichen, keine Werbesprache, keine
  Beschwichtigung.
- Der Hinweis „Anomail ist kein Krisendienst" darf **nirgends abgeschwächt**
  werden.
- Sätze eher kurz. Der Dienst richtet sich an Menschen in belastenden
  Situationen; verschachtelte Rechtssprache erreicht sie nicht.

Die Rechtstexte dürfen davon abweichen, wo Rechtssicherheit es verlangt. Für
die neun Datenschutz-Karten der Kurzfassung und die neun Nutzungsregeln wäre
die einfache Sprache aber der Punkt der Übung.

---

## Kontakt für Rückfragen zur Technik

Fragen zur Funktionsweise lassen sich am Code beantworten. Das Repository
enthält zu jeder Entscheidung eine Begründung im Kommentar; die Ordner
`db/migrations` (Datenmodell und Zugriffsgrenzen) und `lib/actions`
(Abläufe) sind die aussagekräftigsten Stellen.
