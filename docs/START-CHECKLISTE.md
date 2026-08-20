# Was fehlt, damit Anomail vollständig läuft

Stand: 20. August 2026. Die Instanz auf
https://anomail-production.up.railway.app läuft als Vorführung — jeder Punkt
unten trennt sie von einem echten Betrieb.

Sortiert nach dem, was zuerst blockiert.

---

## 1. Ohne das kommt niemand hinein

### SMTP-Zugangsdaten

**Wer:** du · **Aufwand:** 20 Minuten · **Blockiert:** alles

Anomail kennt nur die Anmeldung per Magic-Link. Ohne Mailversand wird kein
Link verschickt, und über `/login` kommt niemand hinein — auch der Kunde
nicht. Aktuell tragen die vier Variablen den Wert `BITTE-EINTRAGEN`.

In den Railway-Variablen des Dienstes `anomail` setzen:

```
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
AUTH_EMAIL_FROM=
```

Ein kostenloses Kontingent bei Brevo, Mailgun oder Postmark reicht für eine
Vorführung. `AUTH_EMAIL_FROM` muss eine Adresse der dort verifizierten Domain
sein, sonst weist der Anbieter den Versand ab.

**Nachprüfen:** `/login` mit einer echten Adresse aufrufen. Kommt nichts an,
steht der Grund in den Logs des Webdienstes.

> Solange SMTP fehlt, gibt es den Vorführ-Zugang über das Cookie
> (siehe `docs/RAILWAY.md`). Der ist ein Notbehelf, kein Ersatz.

---

## 2. Ohne das ist der Betrieb in Deutschland angreifbar

### Betreiberangaben für das Impressum

**Wer:** du · **Aufwand:** 15 Minuten · **Blockiert:** öffentlichen Betrieb

Sieben Felder in `content/legal/betreiber.ts` stehen auf `null`: Name,
Anschrift, E-Mail, Verantwortlicher, Rechtsform, Register, Umsatzsteuer-ID.
Bis sie gefüllt sind, zeigt das Impressum Platzhalter.

Ein deutschsprachiges Angebot ohne Impressum ist abmahnfähig. Das sind
Angaben über dich — erfinden kann ich sie nicht.

### Rechtstexte

**Wer:** Anwältin oder Anwalt · **Aufwand:** extern · **Blockiert:** öffentlichen Betrieb

31 registrierte Platzhalter, davon offen:

| Was | Umfang |
| --- | --- |
| Datenschutzerklärung | 9 Karten |
| Nutzungsregeln | 9 Regeln |
| Kontakttext | 1 Text |

Die Übersicht steht unter `/dev/legal` (nur in der Entwicklung sichtbar).
Jeder Platzhalter nennt, was fehlt und wo es auftaucht.

Es war ausdrücklich nicht meine Aufgabe, diese Texte zu erfinden, und ich
habe es nicht getan. Plausibel klingende Rechtstexte sind gefährlicher als
sichtbare Lücken — man erkennt ihnen nicht an, dass sie falsch sind.

Die **Hilfe-Seite** ist inzwischen gefüllt: sie beschreibt, was die Anwendung
tut, und ist kein Rechtstext. Im Code steht ein `TODO(redaktion)` für die
redaktionelle Abnahme.

---

## 3. Ohne das arbeitet die Anwendung falsch

### Cron-Dienst für abgelaufene Zuweisungen

**Wer:** du · **Aufwand:** 5 Minuten · **Blockiert:** längeren Betrieb

Wer `/listen` öffnet, bekommt einen Brief für 10 Minuten reserviert. Schließt
die Person die Seite, ohne zu antworten, bleibt der Brief **für immer
blockiert**, bis jemand die Freigabe anstößt.

Im Railway-Projekt **New → Empty Service**, aus demselben Repository:

- **Start Command:** `npm run cron:release-leases`
- **Cron Schedule:** `*/5 * * * *`
- **Variables:** `DATABASE_URL=${{Postgres.DATABASE_URL}}`

Das muss über die Weboberfläche laufen — den Zeitplan kann die CLI nicht
setzen. `vercel.json` bleibt unberührt, es gilt nur für einen Vercel-Deploy.

### Ein Admin-Konto

**Wer:** du · **Aufwand:** 2 Minuten

Das Vorführ-Moderationskonto hat die Rolle `moderator`. Das Protokoll unter
`/moderation/audit` sehen nur Admins. Für den Betrieb braucht mindestens eine
Person `admin`:

```sql
UPDATE users SET role = 'admin' WHERE email = 'deine@adresse.de';
```

Bewusst kein Weg über die Oberfläche: Wer sich selbst zum Admin machen kann,
kann fremde Briefe im Klartext lesen.

---

## 4. Vor dem ersten echten Nutzer

### Vorführ-Zugang und Vorführdaten abschalten

**Wer:** du · **Aufwand:** 2 Minuten · **Wichtig**

Beide Variablen entfernen und einmal neu ausrollen:

```
DEMO_ZUGANG
DEMO_DATEN
```

Der Release-Schritt räumt die Vorführ-Sitzungen dann selbst ab. Solange
`DEMO_ZUGANG` steht, ist jeder angemeldet, der das Cookie kennt — bei echten
Briefen von echten Menschen ist das nicht vertretbar.

Die vier Vorführbriefe bleiben in der Datenbank stehen; sie gehören dem Konto
`demo-autor@anomail.invalid` und lassen sich dort löschen.

### Datensicherung

**Wer:** du · **Aufwand:** 10 Minuten

Railways Postgres läuft ohne automatische Sicherung, solange keine
eingerichtet ist. Bei einem Dienst, dessen Inhalt ausschließlich aus
Nutzertexten besteht, ist das ein ernster Punkt.

### Eigene Domain

**Wer:** du · **Aufwand:** 30 Minuten

Danach `AUTH_URL` auf die neue Adresse setzen. Auth.js baut daraus die
Rückkehr-Adresse des Anmeldelinks; steht dort die falsche Domain, führt jeder
Link ins Leere.

---

## 5. Noch nicht nachgewiesen

### Die CI ist nie gelaufen

`.github/workflows/pruefung.yml` beschreibt drei Jobs — Typen und Tokens,
Datenbank, axe über alle Routen. Geschrieben ist er, gelaufen ist er nach
meiner Kenntnis noch nie. Nach dem nächsten Push einmal unter „Actions"
nachsehen. Besonders der axe-Job ist ungewiss: er startet eine eingebettete
PostgreSQL-Instanz und lädt einen Browser.

### Inhaltsprüfung

`SAFETY_PROVIDER=rules` prüft nach festen Regeln, ohne fremden Dienst. Für
eine Vorführung ausreichend. Ob das für den Betrieb reicht, ist eine
inhaltliche Entscheidung, keine technische.

---

## 6. Bekannte Einschränkung

Zwischen Unterseiten gibt es Navigation über Kopf- und Fußleiste. Was fehlt,
ist eine Übersicht über **alle** Bereiche an einer Stelle — die Kopfleiste
zeigt drei. Kein Verstoß, aber eine Lücke, die beim Vorführen auffällt.

---

## Kurzfassung

| Punkt | Wer | Blockiert |
| --- | --- | --- |
| SMTP | du | jede Anmeldung |
| Betreiberangaben | du | öffentlichen Betrieb |
| Rechtstexte | Anwalt | öffentlichen Betrieb |
| Cron-Dienst | du | längeren Betrieb |
| Admin-Konto | du | Protokolleinsicht |
| Demo-Zugang abschalten | du | echte Nutzer |
| Datensicherung | du | Datenverlust |
| CI prüfen | du | nichts, aber ungewiss |

Von diesen acht Punkten kann ich keinen für dich erledigen: Sie brauchen
entweder Zugangsdaten, die nur du hast, Angaben über dich, oder eine
Entscheidung, die dir gehört.
