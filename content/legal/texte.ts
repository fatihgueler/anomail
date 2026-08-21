/**
 * Die Volltexte, die unverändert zu übernehmen sind.
 *
 * Sie waren als "wird separat übergeben" angekündigt, lagen bei der Umsetzung
 * aber nicht vor. Sie hier selbst zu formulieren wäre falsch: es sind
 * Zusagen an Nutzer und teilweise rechtlich bindende Aussagen.
 *
 * Die Struktur steht. Sobald die Texte vorliegen, werden sie hier eingesetzt —
 * an den Seiten selbst ist dann nichts mehr zu ändern.
 */

export type LegalCard = {
  /** Überschrift der Karte. Aus der Vorgabe bekannt. */
  titel: string;
  /** Der Volltext. null, solange er nicht vorliegt. */
  text: string | null;
};

/**
 * Datenschutz-Kurzfassung, /privacy. Die neun Karten.
 *
 * TODO(anwalt): Vorläufige Fassung, nicht anwaltlich geprüft.
 *
 * Diese Texte beschreiben, was die Anwendung tatsächlich tut — nachgesehen im
 * Datenmodell und in den Abläufen, nicht angenommen. Was sie NICHT tun: eine
 * Rechtsgrundlage benennen, eine Speicherfrist zusagen oder einen
 * Auftragsverarbeiter nennen. Solche Angaben stehen weiterhin als Platzhalter
 * in der Langfassung, weil sie eine rechtliche Bewertung oder eine
 * Entscheidung des Betreibers voraussetzen.
 *
 * Beim Übergang in den echten Betrieb prüfen lassen und danach den
 * Vorläufigkeits-Hinweis in components/legal/legal-shell.tsx entfernen.
 */
export const PRIVACY_CARDS: LegalCard[] = [
  {
    titel: "Welche Daten die App benötigt",
    text: "Zum Anmelden brauchen wir deine E-Mail-Adresse. Mehr nicht — kein Name, kein Geburtsdatum, keine Telefonnummer, kein Passwort.\n\nDazu kommt, was du selbst schreibst: deine Briefe, deine Antworten und die Themen, unter denen du sie einordnest.\n\nWir binden keine Werbenetzwerke ein, messen kein Nutzungsverhalten und setzen kein Cookie außer dem, das dich angemeldet hält. Deshalb gibt es hier auch kein Einwilligungsbanner.",
  },
  {
    titel: "Warum eine dauerhafte Nutzeridentität nötig ist",
    text: "Damit du deine Briefe wiederfindest, muss der Dienst dich über mehrere Besuche hinweg wiedererkennen. Sonst wäre jede Antwort nach dem Schließen des Browsers verloren.\n\nDie Wiedererkennung hängt an deinem Konto, nicht an deinem Gerät. Du kannst dich auf jedem Gerät anmelden und findest dasselbe vor.\n\nEs geht dabei nicht darum, dich zu beobachten. Es geht darum, dass ein Briefwechsel über Tage laufen kann.",
  },
  {
    titel: "Warum Briefe und Antworten gespeichert werden",
    text: "Ein Brief wartet, bis jemand ihn liest. Eine Antwort kommt Stunden oder Tage später. Beides setzt voraus, dass der Text so lange bestehen bleibt.\n\nGespeichert wird auf unseren Servern, nicht auf deinem Gerät. Wer an einem Briefwechsel beteiligt ist, kann ihn dort lesen — sonst niemand. Diese Grenze ist in der Datenbank selbst gezogen und nicht nur in der Oberfläche.\n\nWas du löschst, ist weg. Was du stehen lässt, bleibt, bis du es löschst.",
  },
  {
    titel: "Wie Anomail-ID und interne Identität zusammenhängen",
    text: "Intern führen wir ein Konto zu deiner E-Mail-Adresse. Nach außen bist du ausschließlich deine Anomail-ID.\n\nBeides hängt zusammen, aber nur in eine Richtung und nur bei uns: Aus deiner Anomail-ID lässt sich deine Adresse nicht errechnen. Die Kennung wird bei der ersten Anmeldung zufällig gezogen und hat mit deiner Adresse nichts zu tun.\n\nDeine E-Mail-Adresse bekommt kein anderer Nutzer zu sehen. Auch die Moderation nicht.",
  },
  {
    titel: "Deine Anomail-ID ist anonym",
    text: "AN-4KTP-9WXR — mehr sieht die Person am anderen Ende nicht.\n\nDie Kennung wird einmal vergeben und ändert sich nie. Löschst du dein Konto, wird sie zurückgezogen und nie wieder an jemand anderen vergeben. Niemand kann später deine Kennung bekommen und für dich gehalten werden.\n\nAnonym heißt hier: gegenüber anderen Nutzern. Uns gegenüber bist du deine E-Mail-Adresse, sonst könnten wir dich nicht anmelden.",
  },
  {
    titel: "Wie Meldungen und Moderation funktionieren",
    text: "Jeden Brief und jede Nachricht kannst du melden. Die Meldung geht an die Moderation, die sich den gemeldeten Inhalt im Klartext ansieht — das ist die einzige Stelle der Anwendung, an der das geschieht.\n\nDie Moderation sieht keine E-Mail-Adressen und kann nicht frei in fremden Briefen lesen. Sie sieht nur, was gemeldet oder von der automatischen Inhaltsprüfung zurückgehalten wurde. Jeder Zugriff wird protokolliert, und dieses Protokoll lässt sich nachträglich nicht ändern.\n\nDu bekommst eine Rückmeldung, sobald entschieden wurde, und kannst gegen die Entscheidung Widerspruch einlegen.",
  },
  {
    titel: "Welche Daten du löschen kannst",
    text: "Einen wartenden Brief kannst du zurückziehen, solange er niemandem zugeteilt ist. Danach ist er weg.\n\nEine einzelne Nachricht kannst du löschen. Der Gegenseite bleibt sichtbar, dass dort etwas stand, aber nicht mehr, was.\n\nEinen ganzen Briefwechsel kannst du für dich ausblenden. Die andere Person behält ihre Seite unverändert — was sie geschrieben hat, gehört ihr.\n\nEine Kopie all deiner Daten kannst du dir jederzeit unter Einstellungen herunterladen. Dafür musst du uns nicht schreiben.",
  },
  {
    titel: "Wie du dein Konto löschst",
    text: "Unter \"Konto löschen\" tippst du deine Anomail-ID ab und bestätigst. Es gibt keine Wartezeit und keine Rückfrage per E-Mail.\n\nGelöscht werden deine E-Mail-Adresse, deine Anmeldedaten und deine Einstellungen. Deine Nachrichten werden geleert, deine Kennung zurückgezogen.\n\nWas bleibt: Ein Briefwechsel verschwindet für die andere Person nicht vollständig. Sie sieht weiterhin, dass ein Austausch stattgefunden hat — aber keine Inhalte von dir mehr. Sonst könnte jemand einen Briefwechsel nachträglich aus der Erinnerung einer anderen Person entfernen. Ebenfalls bestehen bleiben Einträge zu Meldungen und Moderationsentscheidungen, soweit wir sie nachweisen müssen.",
  },
  {
    titel: "Technische Sicherheitsdaten",
    text: "Damit sich niemand mit fremden Adressen hunderte Anmeldelinks schicken lassen kann, begrenzen wir die Zahl der Anfragen. Dafür merken wir uns kurzzeitig einen unumkehrbaren Prüfwert aus deiner E-Mail-Adresse und deiner IP-Adresse — nicht die Angaben selbst.\n\nDeine Sitzung hängt an einer zufälligen Kennung in unserer Datenbank, nicht an einem Merkmal deines Geräts. Wir lesen keine Geräte-Kennung aus, setzen keinen Fingerabdruck und erkennen dich nicht an deinem Browser wieder.\n\nWie lange der Anbieter unserer Server technische Protokolle führt, steht in der ausführlichen Fassung.",
  },
];

/**
 * Karte 1 und Karte 9 dürfen keine Aussage über eine Geräte-Kennung mehr
 * enthalten. Die Altimplementierung war ein localStorage-Wert, den ein
 * privates Fenster zurücksetzt — als Schutz gegen Sperr-Umgehung wirkungslos.
 * Der Neubau hat nichts dergleichen.
 */
export const PRIVACY_CARDS_OHNE_GERAETEKENNUNG = [0, 8] as const;

/** Nutzungsregeln, /terms. Die neun Regeln. */
export const TERMS_INTRO =
  "Diese Regeln schützen dich und alle anderen. Bitte lies sie in Ruhe.";

/**
 * TODO(anwalt): Vorläufige Fassung, nicht anwaltlich geprüft.
 *
 * Verhaltensregeln, keine Vertragsklauseln. Die vertragliche Seite steht in
 * /agb und bleibt dort, wo sie eine rechtliche Bewertung braucht, Platzhalter.
 *
 * Die Regeln sind so formuliert, wie der Dienst spricht: Du-Form, ruhig, ohne
 * Drohgebärde. Jede sagt, was gilt, und warum — eine Regel ohne Grund liest
 * sich wie Willkür und wird entsprechend behandelt.
 */
export const TERMS_RULES: LegalCard[] = [
  {
    titel: "Schreib von dir",
    text: "Anomail ist für das da, was dich selbst belastet. Schreib in der ersten Person, über deine Lage und dein Erleben.\n\nDas ist keine Formvorschrift. Ein Brief, der von jemand anderem handelt, gibt der antwortenden Person nichts, worauf sie eingehen könnte — und der Person, über die geschrieben wird, keine Gelegenheit zu widersprechen.",
  },
  {
    titel: "Keine Namen, keine Adressen, keine Nummern",
    text: "Nenne weder dich noch andere beim Namen. Keine Anschriften, keine Telefonnummern, keine Arbeitgeber, keine Profile in anderen Diensten.\n\nDas gilt auch für Menschen, über die du schreibst — sie haben nicht zugestimmt, hier vorzukommen.\n\nWenn du merkst, dass du zu genau geworden bist: Der Brief lässt sich zurückziehen, solange ihn noch niemand bekommen hat.",
  },
  {
    titel: "Antworte, oder gib den Brief zurück",
    text: "Wenn du einen Brief zum Lesen bekommst, ist er für zehn Minuten für dich reserviert. Antworte in dieser Zeit oder gib ihn zurück, damit jemand anderes es tun kann.\n\nZurückgeben ist kein Versagen. Es gibt Briefe, zu denen einem nichts einfällt, und ein ehrliches Nichts ist besser als eine Antwort, die man nicht meint.",
  },
  {
    titel: "Rate nichts, was du nicht beurteilen kannst",
    text: "Du bist keine Fachkraft, und die Person am anderen Ende erwartet auch keine. Schreib, was du ehrlich sagen kannst — aus eigener Erfahrung, aus Anteilnahme, aus dem, was dir dazu einfällt.\n\nKeine Diagnosen. Keine Empfehlungen zu Medikamenten. Keine Ratschläge, die eine Behandlung ersetzen sollen.\n\nWenn dir ein Brief zeigt, dass jemand fachliche Hilfe braucht, darfst du das sagen und auf die Telefonseelsorge hinweisen.",
  },
  {
    titel: "Kein Hass, keine Herabwürdigung",
    text: "Beleidigungen, Bedrohungen und Herabwürdigung wegen Herkunft, Religion, Geschlecht, sexueller Orientierung, Behinderung oder Alter haben hier keinen Platz.\n\nWer sich hier öffnet, ist angreifbar. Das auszunutzen ist der schwerste Verstoß gegen den Sinn dieses Dienstes und führt zur Sperre des Kontos.",
  },
  {
    titel: "Nichts Sexuelles, kein Anmachen",
    text: "Sexuelle Inhalte gehören nicht hierher, und schon gar nicht ungefragt. Anomail ist kein Ort zum Anbahnen von Kontakten.\n\nVersuche, ein Gespräch in diese Richtung zu lenken, kannst du melden. Der Kontakt lässt sich mit einem Klick beenden.",
  },
  {
    titel: "Keine Werbung, keine Weiterleitung",
    text: "Keine Angebote, keine Links auf eigene Seiten, keine Aufforderung, woanders weiterzuschreiben.\n\nEin Brief ist keine Gelegenheit. Wer hier schreibt, sucht ein Gegenüber und keinen Empfänger für etwas anderes.",
  },
  {
    titel: "Meld es, wenn etwas nicht stimmt",
    text: "Jeden Brief und jede Nachricht kannst du melden. Du brauchst dafür keinen Beweis und musst dir nicht sicher sein — die Moderation sieht es sich an.\n\nDu kannst eine Kennung außerdem blockieren. Die andere Person erfährt davon nichts.\n\nMeldungen ins Blaue hinein helfen niemandem. Wer den Meldeweg dauerhaft missbraucht, um andere loszuwerden, verstößt selbst gegen diese Regeln.",
  },
  {
    titel: "Bei Gefahr: Notruf, nicht Anomail",
    text: "Wenn du daran denkst, dir das Leben zu nehmen, oder wenn jemand in unmittelbarer Gefahr ist, warte nicht auf eine Antwort hier.\n\nNotruf 112. Telefonseelsorge 0800 111 0 111 — kostenlos, anonym, rund um die Uhr.\n\nAnomail ist kein Krisendienst. Eine Antwort kann Tage dauern oder ausbleiben. Darauf darfst du dich in einer Notlage nicht verlassen.",
  },
];

/**
 * Hilfe, /help. Die sieben bestehenden Karten.
 *
 * Diese Texte beschreiben, was die Anwendung tatsaechlich tut — sie sind keine
 * Rechtstexte und deshalb hier ausgeschrieben statt als Platzhalter. Sie
 * standen vorher als "[ANWALTLICH ZU PRÜFEN: …]" sichtbar auf der Seite.
 *
 * TODO(redaktion): Fachlich richtig, aber nicht redaktionell abgenommen.
 * Vor dem oeffentlichen Betrieb einmal durchgehen — insbesondere die Fristen
 * in "Melden" und "Konto löschen" gegen die endgueltigen Rechtstexte
 * abgleichen.
 */
export const HELP_CARDS: LegalCard[] = [
  {
    titel: "Was ist Anomail",
    text: "Du schreibst auf, was dich belastet, und schickst es ab. Dein Brief geht an genau einen anderen Menschen, der sich entschieden hat zuzuhören. Er liest ihn und antwortet dir.\n\nIhr seht voneinander nur eine zufällige Kennung in der Form AN-XXXX-XXXX. Kein Name, kein Profil, kein Bild, keine Liste früherer Briefe. Wenn ihr wollt, wird aus dem Austausch ein Gespräch; wenn nicht, bleibt es bei einem Brief und einer Antwort.\n\nEs gibt keine Reichweite und keine Bewertungen. Niemand kann sehen, wie viele Briefe du geschrieben hast, und nichts davon wird geteilt.",
  },
  {
    titel: "Kein Therapie- oder Notfalldienst",
    text: "Anomail ist kein Krisendienst und ersetzt keine Therapie, keine Beratung und keine ärztliche Behandlung. Die Menschen, die hier antworten, sind keine Fachkräfte. Sie sind Nutzerinnen und Nutzer wie du.\n\nEine Antwort kann Tage dauern oder ganz ausbleiben. Verlass dich also nicht darauf, wenn es dir akut schlecht geht.\n\nWenn du fachliche Hilfe brauchst, wende dich an die Telefonseelsorge unter 0800 111 0 111, an deine Hausärztin oder deinen Hausarzt oder an eine psychosoziale Beratungsstelle in deiner Nähe.",
  },
  {
    titel: "Bei unmittelbarer Gefahr",
    text: "Wenn du daran denkst, dir das Leben zu nehmen, oder wenn du in akuter Gefahr bist, warte nicht auf eine Antwort hier.\n\nNotruf: 112 — rund um die Uhr, auch ohne Guthaben.\nTelefonseelsorge: 0800 111 0 111 und 0800 111 0 222 — kostenlos, anonym, rund um die Uhr.\n\nBeide Nummern erreichst du auch über die Fußzeile jeder Seite. Du musst nicht wissen, was du sagen willst, bevor du anrufst.",
  },
  {
    titel: "Melden",
    text: "Jeden Brief und jede Nachricht kannst du melden. Du wählst dabei einen Grund aus und kannst ergänzen, was dir aufgefallen ist.\n\nDie Meldung geht an die Moderation. Sie sieht den gemeldeten Inhalt im Klartext — das ist die einzige Stelle in der Anwendung, an der das passiert. Deine E-Mail-Adresse bekommt sie dabei nicht zu sehen.\n\nDu bekommst eine Rückmeldung, sobald über die Meldung entschieden wurde, und siehst den Stand jederzeit unter \"Meine Meldungen\". Bist du mit der Entscheidung nicht einverstanden, kannst du Widerspruch einlegen.",
  },
  {
    titel: "Blockieren",
    text: "Du kannst eine Kennung blockieren. Danach bekommt ihr keine Briefe und keine Nachrichten mehr voneinander, und ein laufendes Gespräch lässt sich nicht fortsetzen.\n\nDie blockierte Person erfährt nicht, dass du sie blockiert hast. Sie bekommt keine Benachrichtigung und keine abweichende Fehlermeldung — für sie sieht es aus wie jede andere Stelle, an der ein Gespräch endet.\n\nUnter \"Blockierte Kennungen\" siehst du, wen du blockiert hast, und kannst es rückgängig machen.",
  },
  {
    titel: "Briefwechsel löschen",
    text: "Beim Löschen hast du drei Stufen zur Wahl.\n\nEinzelne Nachricht: Nur dieser eine Beitrag verschwindet. Die andere Person sieht an der Stelle, dass etwas gelöscht wurde, aber nicht mehr, was dort stand.\n\nGespräch für dich ausblenden: Der Briefwechsel verschwindet aus deiner Übersicht. Die andere Person behält ihre Seite unverändert.\n\nWartenden Brief zurückziehen: Solange ein Brief noch niemandem zugeteilt wurde, kannst du ihn ganz zurücknehmen. Danach ist er weg.",
  },
  {
    titel: "Konto löschen",
    text: "Du kannst dein Konto jederzeit unter \"Konto löschen\" selbst löschen. Es gibt keine Wartezeit und keine Rückfrage per E-Mail — zur Bestätigung tippst du deine Anomail-ID ab.\n\nGelöscht werden deine E-Mail-Adresse, deine Anmeldedaten und deine Einstellungen. Deine Nachrichten werden geleert, und deine Anomail-ID wird zurückgezogen und nie wieder vergeben.\n\nWas bleibt: Gespräche, an denen jemand anderes beteiligt war, verschwinden für die andere Person nicht vollständig. Sie sieht weiterhin, dass dort ein Austausch stattgefunden hat, aber keine Inhalte von dir mehr. Das ist Absicht — sonst könnte jemand einen Briefwechsel nachträglich aus der Erinnerung einer anderen Person entfernen.\n\nEine Kopie deiner Daten kannst du dir vor dem Löschen unter \"Einstellungen\" herunterladen.",
  },
];

/**
 * Die achte Karte ist neu und beschreibt das Widerspruchsverfahren aus AP8.
 * Sie ist keine Übernahme aus dem Altbestand, sondern eine Beschreibung des
 * tatsächlichen Verhaltens der Anwendung — deshalb steht der Text hier.
 */
export const HELP_CARD_WIDERSPRUCH: LegalCard = {
  titel: "Widerspruch gegen eine Entscheidung",
  text: [
    "Wenn wir einen Brief oder eine Nachricht von dir ausblenden oder dein Konto sperren, bekommst du eine Begründung dazu angezeigt — an dem betroffenen Inhalt selbst und bei einer Sperre auf der Sperrseite.",
    "Hältst du die Entscheidung für falsch, kannst du an derselben Stelle widersprechen. Schildere kurz, warum. Dein Widerspruch geht an die Moderation, wird dort noch einmal angesehen, und du bekommst eine begründete Antwort.",
    "Pro Inhalt ist ein Widerspruch möglich. Solange er offen ist, siehst du den Stand an derselben Stelle.",
  ].join("\n\n"),
};

/**
 * Kontakt, /contact.
 *
 * TODO(anwalt): Vorläufige Fassung, nicht anwaltlich geprüft.
 *
 * Die Adresse selbst steht bewusst nicht hier, sondern kommt aus
 * content/legal/betreiber.ts und erscheint als Platzhalter, solange sie fehlt.
 */
export const CONTACT_TEXT: string =
  "Für Fragen zum Dienst, zu einer Moderationsentscheidung oder zu deinen Daten erreichst du uns per E-Mail. Die Adresse steht im Impressum.\n\nSchreib bitte nicht deinen Brief an diese Adresse — sie ist kein zweiter Weg, gehört zu werden, und wir können dort nicht die Rolle übernehmen, die eigentlich die Person am anderen Ende deines Briefs hat.\n\nWenn du dich auf eine Meldung oder eine Sperre beziehst, nenne uns deine Anomail-ID. Ohne sie können wir den Vorgang nicht zuordnen — deine E-Mail-Adresse allein hilft uns dabei nicht weiter, weil die Moderation sie bewusst nicht zu sehen bekommt.\n\nIn einer akuten Krise wende dich bitte nicht an uns, sondern an die Telefonseelsorge unter 0800 111 0 111 oder an den Notruf 112. Wir lesen E-Mails nicht rund um die Uhr.";
