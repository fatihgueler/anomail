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

/** Hilfe, /help. Die sieben bestehenden Karten. */
export const HELP_CARDS: LegalCard[] = [
  { titel: "Was ist Anomail", text: null },
  { titel: "Kein Therapie- oder Notfalldienst", text: null },
  { titel: "Bei unmittelbarer Gefahr", text: null },
  { titel: "Melden", text: null },
  { titel: "Blockieren", text: null },
  { titel: "Briefwechsel löschen", text: null },
  { titel: "Konto löschen", text: null },
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
