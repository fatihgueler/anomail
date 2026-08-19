# Auf Railway ausrollen

## Stand: die Instanz läuft bereits

| | |
| --- | --- |
| Adresse | https://anomail-production.up.railway.app |
| Railway-Projekt | `anomail` |
| Dienste | `anomail` (Web, aus GitHub `main`), `Postgres` |
| Datenbank | Schema, Rollenpasswort, Kategorien und vier Vorführbriefe sind angelegt |

**Es fehlt genau eine Sache, und ohne sie kommt niemand über die Startseite
hinaus: die SMTP-Zugangsdaten.** Sie stehen als `BITTE-EINTRAGEN` in den
Variablen. Ohne sie wird kein Anmeldelink verschickt. Siehe Schritt 2,
Abschnitt „Mailversand".

Alles Übrige — `AUTH_SECRET`, `APP_DB_PASSWORD`, `CRON_SECRET`, `AUTH_URL`,
die Datenbankverbindungen — ist erzeugt und gesetzt.

Diese Anleitung beschreibt den Weg vollständig, damit er sich wiederholen
lässt, etwa für eine zweite Umgebung.

---

## Was schon vorbereitet ist

| Datei | Zweck |
| --- | --- |
| `railway.json` | Build, Release-Schritt und Startbefehl |
| `scripts/deploy-bootstrap.mts` | Läuft vor jedem Start: Migrationen, Passwort der Anwendungsrolle, Kategorien. Mehrfach ausführbar. |
| `scripts/demo-daten.mts` | Vier wartende Briefe, damit `/listen` nicht leer ist. Löscht nichts, legt nicht doppelt an. |
| `scripts/cron-release-leases.mts` | Gibt abgelaufene Briefzuweisungen frei. Auf Railway als eigener Cron-Dienst statt über `vercel.json`. |
| `lib/auth/mailer.ts` | Neu: `SmtpMailer`. Vorher gab es nur `console`, und das verweigert im Betrieb den Dienst — niemand hätte sich anmelden können. |

---

## Schritt 1 — Projekt und Datenbank

1. Auf [railway.app](https://railway.app) einloggen, **New Project →
   Deploy from GitHub repo → `fatihgueler/anomail`**.
2. Im selben Projekt: **New → Database → Add PostgreSQL**.

Railway legt damit zwei Dienste an: den Webdienst und die Datenbank.

---

## Schritt 2 — Umgebungsvariablen des Webdienstes

Unter **Variables** des Webdienstes eintragen. Die Referenzen in `${{...}}`
löst Railway selbst auf; sie können so übernommen werden.

### Datenbank

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
APP_DB_PASSWORD=EINTRAGEN
DATABASE_URL_APP=EINTRAGEN
```

`APP_DB_PASSWORD` ist ein selbst gewähltes Passwort — irgendeine lange
Zufallsfolge. `DATABASE_URL_APP` ist dieselbe Verbindung wie `DATABASE_URL`,
aber mit Benutzer `anomail_app` und genau diesem Passwort:

```
postgres://anomail_app:DEIN_PASSWORT@${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}
```

> **Warum zwei Verbindungen?** Die Anwendung verbindet sich als `anomail_app`,
> damit Row Level Security greift. Ein Superuser umgeht RLS — der Code prüft
> das beim Start und bricht ab, wenn die App-Verbindung zu viele Rechte hat.
> Das ist Absicht und darf nicht umgangen werden.

### Anmeldung

```
AUTH_SECRET=EINTRAGEN
AUTH_URL=https://EINTRAGEN.up.railway.app
AUTH_EMAIL_FROM=EINTRAGEN
```

`AUTH_SECRET` erzeugen mit `npx auth secret`. `AUTH_URL` ist die Domain, die
Railway dem Webdienst gibt (unter **Settings → Networking**, erst nach dem
ersten Deploy sichtbar) — ohne Schrägstrich am Ende.

> `AUTH_URL` muss stimmen. Auth.js baut daraus die Rückkehr-Adresse des
> Anmeldelinks; steht dort die falsche Domain, führt der Link ins Leere.

### Mailversand — ohne das kommt niemand hinein

```
MAIL_TRANSPORT=smtp
SMTP_HOST=EINTRAGEN
SMTP_PORT=587
SMTP_USER=EINTRAGEN
SMTP_PASSWORD=EINTRAGEN
```

Funktioniert mit jedem SMTP-Anbieter. Für eine Vorführung reicht ein kostenloses
Kontingent, etwa bei Brevo, Mailgun oder Postmark. `AUTH_EMAIL_FROM` muss eine
Adresse der dort verifizierten Domain sein, sonst weisen die Anbieter den
Versand ab.

### Übriges

```
CRON_SECRET=EINTRAGEN
SAFETY_PROVIDER=rules
NODE_ENV=production
```

`SAFETY_PROVIDER=rules` prüft Inhalte nach festen Regeln, ohne fremden Dienst —
für eine Vorführung ausreichend und ohne laufende Kosten.

---

## Schritt 3 — Erster Deploy

Railway baut nach dem Setzen der Variablen von selbst. Der Release-Schritt
(`npm run deploy:bootstrap`) läuft vor dem Start und legt Schema, Rollenpasswort
und Kategorien an. In den Logs muss stehen:

```
1/3  Migrationen
2/3  Passwort der Anwendungsrolle
3/3  Kategorien

Datenbank ist betriebsbereit.
```

Bricht er ab, startet die Anwendung nicht — das ist gewollt. Eine Anwendung
ohne Schema wäre schlimmer als keine.

---

## Schritt 4 — Vorführdaten

Damit `/listen` etwas anzuzeigen hat, die Variable setzen:

```
DEMO_DATEN=true
```

Der Release-Schritt legt daraufhin vier wartende Briefe an. Ein zweiter Lauf
ändert nichts, und gelöscht wird nie etwas.

> Der naheliegende Weg `railway run npm run demo:daten` funktioniert **nicht**.
> `railway run` führt den Befehl auf deinem Rechner aus, `DATABASE_URL` zeigt
> aber auf `postgres.railway.internal` — erreichbar nur aus dem Projektnetz.
> Die Datenbank dafür öffentlich zu machen wäre der falsche Preis.

Lokal, gegen die Entwicklungsdatenbank, geht der direkte Aufruf weiterhin:

```bash
npm run demo:daten
```

---

## Schritt 5 — Cron-Dienst

Abgelaufene Briefzuweisungen müssen freigegeben werden, sonst bleibt ein Brief
für immer blockiert, wenn jemand die Seite schließt, ohne zu antworten.

**New → Empty Service** im selben Projekt, aus demselben Repository:

- **Start Command**: `npm run cron:release-leases`
- **Cron Schedule**: `*/5 * * * *`
- **Variables**: `DATABASE_URL=${{Postgres.DATABASE_URL}}`

Der Dienst läuft, erledigt seine Arbeit und beendet sich. `vercel.json` bleibt
unberührt — es gilt nur für einen Vercel-Deploy.

---

## Schritt 6 — Nachsehen, ob es hält

1. `https://<domain>/` öffnet die Startseite.
2. `/login` mit einer echten Adresse: Der Anmeldelink muss ankommen. Kommt
   nichts, liegt es an SMTP — die Logs des Webdienstes zeigen den Grund.
3. Nach dem Anmelden zeigt `/listen` einen der vier Vorführbriefe.
4. `/write` nimmt einen Brief mit mindestens 80 Zeichen an.

---

## Was der Kunde zu sehen bekommt

Er meldet sich mit seiner eigenen Adresse an, bekommt einen Anmeldelink und
kann dann schreiben, zuhören, antworten und die Einstellungen ansehen. Der
Moderationsbereich bleibt ihm verschlossen — dafür braucht sein Konto die Rolle
`moderator`. Setzen lässt sich das nur direkt an der Datenbank:

```sql
UPDATE users SET role = 'moderator' WHERE email = 'adresse@des.kunden';
```

Bewusst kein Weg über die Oberfläche: Wer sich selbst zum Moderator machen
kann, kann fremde Briefe im Klartext lesen.

---

## Offene Punkte

**1. Rechtstexte.** Impressum, Datenschutz und Nutzungsbedingungen enthalten 26
Platzhalter in der Form `[ANWALTLICH ZU PRÜFEN: …]`. Sie sind auf der
Vorführinstanz sichtbar. Für eine reine Ansicht ist das in Ordnung, für einen
öffentlichen Betrieb nicht — ohne Impressum ist ein deutschsprachiges Angebot
abmahnfähig. Übersicht unter `/dev/legal` (nur in der Entwicklung).

**2. Keine seitenübergreifende Navigation.** Siehe `docs/AP10-abnahme.md`,
Abschnitt 6. Die Startseite führt inzwischen in alle Bereiche, aber von einer
Unterseite aus gibt es weiterhin keinen Weg zu einer anderen — nur zurück zur
Startseite oder über den Zurück-Knopf. Für eine Vorführung reicht das, wenn der
Kunde weiß, dass er über `/` navigiert. Eine Kopfleiste, die auf jeder Seite
steht, fehlt weiterhin.

**2b. Der Cron-Dienst ist nicht angelegt.** Schritt 5 ist offen. Ohne ihn bleibt
ein Brief blockiert, wenn jemand `/listen` öffnet und ohne Antwort weggeht. Bei
vier Vorführbriefen und wenigen Betrachtern fällt das kaum auf; für einen
längeren Betrieb muss der Dienst eingerichtet werden.

**3. Backups.** Railways Postgres läuft ohne automatische Sicherung, solange du
keine einrichtest. Für eine Vorführung mit Testdaten unerheblich.
