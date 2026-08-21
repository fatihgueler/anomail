# E-Mail-Versand für Anomail einrichten

Diese Anleitung ist zum Weitergeben gedacht. Am Ende stehen **vier Angaben**,
die für den Betrieb gebraucht werden.

Aufwand: etwa 20 Minuten. Vorkenntnisse sind nicht nötig.

---

## Worum es geht

Anomail hat kein Passwort. Wer sich anmeldet, gibt seine E-Mail-Adresse ein
und bekommt einen Link geschickt — ein Klick darauf, und er ist drin.

Damit dieser Link verschickt werden kann, braucht die Anwendung einen
Postausgang: einen Dienst, der E-Mails in ihrem Namen zustellt. Genau das
wird hier eingerichtet.

**Ohne diesen Schritt kann sich niemand anmelden.** Es ist der einzige Punkt,
der den Start noch aufhält.

> Warum nicht einfach eine normale E-Mail-Adresse, etwa bei Gmail oder GMX?
> Weil Anbieter automatisierten Versand über solche Konten sperren, sobald es
> mehr als ein paar Mails am Tag werden. Die Anmeldelinks kämen dann still
> nicht mehr an.

---

## Schritt 1 — Anbieter wählen

Es gibt mehrere. Drei, die für diesen Zweck gut passen:

| Anbieter | Kostenloses Kontingent | Anmerkung |
| --- | --- | --- |
| **Brevo** (brevo.com) | 300 Mails am Tag, dauerhaft | Oberfläche auf Deutsch. Für den Anfang die einfachste Wahl. |
| **Mailgun** (mailgun.com) | 100 Mails am Tag | Englisch, sehr zuverlässig |
| **Postmark** (postmarkapp.com) | 100 Mails im Monat | Englisch, beste Zustellraten, danach kostenpflichtig |

**Empfehlung: Brevo**, wenn keine besonderen Gründe dagegen sprechen. Die
weiteren Schritte beschreiben Brevo; bei den anderen heißen die Menüpunkte
anders, der Ablauf ist derselbe.

---

## Schritt 2 — Konto anlegen

1. Auf [brevo.com](https://www.brevo.com) gehen und ein Konto anlegen.
2. Firmennamen und Land eintragen. Beim Verwendungszweck genügt „Transaktions-
   E-Mails" oder „Systembenachrichtigungen".
3. Die Bestätigungsmail abwarten und den Link darin anklicken.

> Brevo fragt beim ersten Anmelden eventuell nach einer Telefonnummer und
> schaltet den Versand erst danach frei. Das ist normal und dient dazu,
> Missbrauch zu erschweren.

---

## Schritt 3 — Absender-Domain hinterlegen

Damit die Anmeldelinks nicht im Spam-Ordner landen, muss dem Anbieter
bestätigt werden, dass Sie die Domain besitzen, aus der die Mails kommen
sollen — zum Beispiel `anomail.de`.

1. In Brevo links auf **Senders, Domains & Dedicated IPs** gehen,
   dann auf den Reiter **Domains**.
2. Auf **Add a domain** klicken und die Domain eintragen.
3. Brevo zeigt daraufhin **drei bis vier Einträge** an, die im
   DNS der Domain hinterlegt werden müssen. Sie sehen ungefähr so aus:

   ```
   Typ    Name              Wert
   TXT    brevo-code        abc123...
   TXT    @                 v=spf1 include:spf.brevo.com ...
   TXT    mail._domainkey   k=rsa; p=MIGf...
   ```

4. Diese Einträge dort eintragen, wo die Domain verwaltet wird — beim
   Domain-Anbieter (IONOS, Strato, Namecheap, Cloudflare oder wo auch immer
   die Domain gekauft wurde), im Bereich **DNS** oder **Nameserver**.
5. Zurück in Brevo auf **Verify** oder **Authenticate** klicken.

> Bis DNS-Änderungen wirken, dauert es meist einige Minuten, in Einzelfällen
> bis zu 24 Stunden. Wenn die Prüfung nicht sofort klappt: später noch einmal
> versuchen.

> **Wenn noch keine Domain vorhanden ist:** Der Versand funktioniert für einen
> ersten Test auch ohne eigene Domain — dann allerdings mit deutlich
> schlechteren Zustellraten und einer fremden Absenderadresse. Für die
> Vorführung reicht das; für den Betrieb sollte die Domain hinterlegt werden.

---

## Schritt 4 — Zugangsdaten erzeugen

Jetzt entstehen die vier Angaben, um die es geht.

1. In Brevo links auf **SMTP & API** gehen, Reiter **SMTP**.
2. Dort steht bereits:

   ```
   SMTP Server:  smtp-relay.brevo.com
   Port:         587
   Login:        <eine E-Mail-Adresse oder Nummer>
   ```

3. Auf **Generate a new SMTP key** klicken. Es erscheint ein langer
   Zeichenkette — das ist das Passwort.

> **Diese Zeichenkette wird nur einmal angezeigt.** Gleich kopieren. Geht sie
> verloren, lässt sich ein neuer Schlüssel erzeugen; der alte wird dadurch
> ungültig.

---

## Schritt 5 — Die vier Angaben zurückmelden

Bitte diese vier Werte übermitteln:

```
SMTP_HOST         = smtp-relay.brevo.com
SMTP_USER         = (der Login aus Schritt 4)
SMTP_PASSWORD     = (der erzeugte Schlüssel)
AUTH_EMAIL_FROM   = (die Absenderadresse, z. B. anmeldung@ihre-domain.de)
```

Zu `AUTH_EMAIL_FROM`: Das ist die Adresse, die Empfänger als Absender sehen.
Sie muss zu der in Schritt 3 hinterlegten Domain gehören. Ein Postfach dahinter
ist nicht nötig — es wird nur versendet, nicht empfangen.

### Zur Übermittlung

Der SMTP-Schlüssel ist ein Passwort. Wer ihn hat, kann in Ihrem Namen Mails
verschicken.

**Bitte nicht per einfacher E-Mail oder Chatnachricht.** Besser:

- über einen Passwort-Manager mit Freigabefunktion (1Password, Bitwarden), oder
- über einen selbstlöschenden Dienst wie [onetimesecret.com](https://onetimesecret.com), oder
- am Telefon.

Alternativ können die vier Werte auch direkt selbst eingetragen werden — dann
verlässt der Schlüssel Ihr Haus gar nicht. Wo das geschieht, sagen wir Ihnen
gern.

---

## Danach

Sobald die Werte eingetragen sind, wird der Versand geprüft: eine Anmeldung
mit einer echten Adresse, und es wird nachgesehen, ob der Link ankommt.
Rückmeldung erfolgt, sobald das bestätigt ist.

---

## Häufige Rückfragen

**Kostet das etwas?**
Im kostenlosen Kontingent nicht. 300 Anmeldelinks am Tag entsprechen sehr viel
Betrieb. Erst darüber hinaus wird es kostenpflichtig.

**Kann ein bestehendes Firmenpostfach genutzt werden?**
Technisch ja, praktisch nicht empfehlenswert. Microsoft 365 und Google
Workspace drosseln automatisierten Versand und sperren Konten bei Verdacht.
Ein Anbieter für Transaktions-Mails ist dafür gebaut.

**Was passiert mit den E-Mail-Adressen der Nutzer?**
Sie werden ausschließlich zum Versand des Anmeldelinks an den Anbieter
übergeben. Anderen Nutzern werden sie nie angezeigt, der Moderation ebenso
wenig. Der gewählte Anbieter muss in der Datenschutzerklärung als
Auftragsverarbeiter benannt werden — dafür werden Name, Sitz und die
Vertragsgrundlage gebraucht.

**Lässt sich der Anbieter später wechseln?**
Ja. Es sind vier Werte; die Anwendung ist an keinen Anbieter gebunden.
