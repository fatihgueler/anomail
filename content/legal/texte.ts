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

/** Datenschutz-Kurzfassung, /privacy. Die neun Karten. */
export const PRIVACY_CARDS: LegalCard[] = [
  { titel: "Welche Daten die App benötigt", text: null },
  { titel: "Warum eine dauerhafte Nutzeridentität nötig ist", text: null },
  { titel: "Warum Briefe und Antworten gespeichert werden", text: null },
  { titel: "Wie Anomail-ID und interne Identität zusammenhängen", text: null },
  { titel: "Deine Anomail-ID ist anonym", text: null },
  { titel: "Wie Meldungen und Moderation funktionieren", text: null },
  { titel: "Welche Daten du löschen kannst", text: null },
  { titel: "Wie du dein Konto löschst", text: null },
  { titel: "Technische Sicherheitsdaten", text: null },
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

export const TERMS_RULES: LegalCard[] = Array.from({ length: 9 }, (_, index) => ({
  titel: `Regel ${index + 1}`,
  text: null,
}));

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

/** Kontakt, /contact. */
export const CONTACT_TEXT: string | null = null;
