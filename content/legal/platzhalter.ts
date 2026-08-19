/**
 * Alle offenen Stellen der Rechtstexte, an einem Ort.
 *
 * Diese Datei ist die Übergabe an die anwaltliche Prüfung. Jeder Eintrag steht
 * für eine Angabe, die rechtlich erforderlich ist und die hier bewusst NICHT
 * erfunden wurde. Die Oberfläche rendert sie sichtbar als Platzhalter — nicht
 * versteckt, nicht mit plausibel klingendem Beispieltext gefüllt.
 *
 * Eine erfundene Speicherfrist oder eine erfundene Rechtsgrundlage ist
 * schlimmer als eine sichtbare Lücke: die Lücke fällt bei der Prüfung auf, die
 * Erfindung nicht.
 *
 * Die Übersicht unter /dev/legal listet alle Einträge mit Fundort.
 */

export type PlaceholderId = keyof typeof PLACEHOLDERS;

export type PlaceholderEntry = {
  /** Was fehlt. Erscheint im Text zwischen den Klammern. */
  fehlt: string;
  /** Wo im Produkt die Lücke sitzt. */
  fundort: string;
  /** Warum es hier eine Lücke gibt, wenn das nicht offensichtlich ist. */
  hinweis?: string;
};

export const PLACEHOLDERS = {
  /* ---------------------------------------------------------------- */
  /* Betreiberangaben                                                  */
  /* ---------------------------------------------------------------- */
  betreiberName: {
    fehlt: "Name oder Firmierung des Betreibers",
    fundort: "/impressum, /contact, /privacy/vollstaendig",
  },
  betreiberAnschrift: {
    fehlt: "Ladungsfähige Anschrift des Betreibers",
    fundort: "/impressum, /privacy/vollstaendig",
  },
  betreiberEmail: {
    fehlt: "Kontakt-E-Mail-Adresse des Betreibers",
    fundort: "/impressum, /contact, /privacy/vollstaendig",
  },
  betreiberVerantwortlicher: {
    fehlt: "Verantwortlicher nach § 18 Abs. 2 MStV",
    fundort: "/impressum",
  },
  betreiberRechtsform: {
    fehlt: "Rechtsform des Betreibers",
    fundort: "/impressum",
    hinweis:
      "Bestimmt mit, welche weiteren Pflichtangaben nötig sind (Register, Vertretungsberechtigte).",
  },
  betreiberRegister: {
    fehlt: "Register und Registernummer, falls zutreffend",
    fundort: "/impressum",
  },
  betreiberUmsatzsteuerId: {
    fehlt: "Umsatzsteuer-Identifikationsnummer, falls vorhanden",
    fundort: "/impressum",
  },

  /* ---------------------------------------------------------------- */
  /* Impressum                                                         */
  /* ---------------------------------------------------------------- */
  impressumHaftungstext: {
    fehlt: "Haftungstext auf DDG-Wortlaut abgleichen",
    fundort: "/impressum",
    hinweis:
      "Das TMG ist seit 14.05.2024 außer Kraft. Die Paragraphennummern sind hier auf DDG umgestellt — die Formulierung selbst ist damit noch nicht geprüft.",
  },
  impressumVerbraucherschlichtung: {
    fehlt: "Angabe zur Verbraucherschlichtung nach § 36 VSBG",
    fundort: "/impressum",
  },

  /* ---------------------------------------------------------------- */
  /* Datenschutz — Kurzfassung                                         */
  /* ---------------------------------------------------------------- */
  privacyTechnischeSicherheitsdaten: {
    fehlt: "Formulierung zu technischen Sicherheitsdaten ohne Geräte-Kennung",
    fundort: "/privacy, Karte 1 und Karte 9",
    hinweis:
      "Der Altbestand beschrieb eine Geräte-Kennung als Sicherheitsmaßnahme. Sie war ein localStorage-Wert, den ein privates Fenster zurücksetzt, und ist im Neubau nicht vorhanden. Jede Aussage darüber ist gestrichen.",
  },

  /* ---------------------------------------------------------------- */
  /* Datenschutz — Vollfassung                                         */
  /* ---------------------------------------------------------------- */
  dsgvoRechtsgrundlagen: {
    fehlt: "Rechtsgrundlage je Verarbeitung nach Art. 6 DSGVO",
    fundort: "/privacy/vollstaendig, Abschnitt 3",
  },
  dsgvoSpeicherdauer: {
    fehlt: "Speicherdauer bzw. Löschfrist je Datenart",
    fundort: "/privacy/vollstaendig, Abschnitt 4",
    hinweis:
      "Die technische Umsetzung liest die Frist aus RETENTION_DAYS in content/legal/aufbewahrung.ts. Der Wert dort ist ebenfalls ungeprüft.",
  },
  dsgvoAuftragsverarbeiterHosting: {
    fehlt: "Auftragsverarbeiter Hosting: Name, Sitz, Vertragsgrundlage",
    fundort: "/privacy/vollstaendig, Abschnitt 5",
  },
  dsgvoAuftragsverarbeiterMail: {
    fehlt: "Auftragsverarbeiter Mailversand: Name, Sitz, Vertragsgrundlage",
    fundort: "/privacy/vollstaendig, Abschnitt 5",
    hinweis:
      "Im Neubau ist noch kein Versanddienst verdrahtet. MAIL_TRANSPORT=console schreibt den Anmeldelink ins Terminal und ist nur für die Entwicklung zulässig.",
  },
  dsgvoAuftragsverarbeiterLlm: {
    fehlt: "Auftragsverarbeiter der Inhaltsprüfung: Name, Sitz, Vertragsgrundlage",
    fundort: "/privacy/vollstaendig, Abschnitt 5",
    hinweis:
      "Voreinstellung ist die regelbasierte Prüfung ohne externen Dienst. Wird SAFETY_PROVIDER auf openai-compatible gestellt, verlässt der Brieftext den Server und dieser Eintrag wird zwingend.",
  },
  dsgvoDrittland: {
    fehlt: "Drittlandtransfer: Ziel, Garantien nach Art. 44 ff. DSGVO",
    fundort: "/privacy/vollstaendig, Abschnitt 6",
  },
  dsgvoAufsichtsbehoerde: {
    fehlt: "Zuständige Aufsichtsbehörde mit Anschrift",
    fundort: "/privacy/vollstaendig, Abschnitt 8",
  },
  dsgvoMindestalter: {
    fehlt: "Mindestalter nach Art. 8 DSGVO und wie es geprüft wird",
    fundort: "/privacy/vollstaendig, Abschnitt 10; /agb, Abschnitt 4",
    hinweis:
      "Im Code findet derzeit keine Altersprüfung statt. Eine Angabe im Text ohne technische Entsprechung wäre eine unzutreffende Zusage.",
  },
  dsgvoAutomatisierteEntscheidung: {
    fehlt:
      "Bewertung, ob die Inhaltsprüfung eine automatisierte Entscheidung im Sinne von Art. 22 DSGVO darstellt",
    fundort: "/privacy/vollstaendig, Abschnitt 9",
    hinweis:
      "Sachlage aus dem Code: die Prüfung kann einen Beitrag zurückhalten. Die Entscheidung wird der Moderation vorgelegt und dort von einem Menschen bestätigt oder aufgehoben. Ob das als menschliches Eingreifen im Sinne der Vorschrift genügt, ist eine rechtliche Bewertung.",
  },

  /* ---------------------------------------------------------------- */
  /* AGB                                                               */
  /* ---------------------------------------------------------------- */
  agbVertragsgegenstand: {
    fehlt: "Vertragsgegenstand und Leistungsbeschreibung",
    fundort: "/agb, Abschnitt 1",
  },
  agbVertragsschluss: {
    fehlt: "Zustandekommen des Vertrags",
    fundort: "/agb, Abschnitt 2",
  },
  agbNutzerpflichten: {
    fehlt: "Pflichten des Nutzers in vertraglicher Form",
    fundort: "/agb, Abschnitt 3",
    hinweis:
      "Die Verhaltensregeln unter /terms sind kein Vertragstext. Der Verweis darauf ersetzt die vertragliche Ausgestaltung nicht.",
  },
  agbKuendigung: {
    fehlt: "Kündigung und Kontolöschung in vertraglicher Form",
    fundort: "/agb, Abschnitt 5",
  },
  agbHaftung: {
    fehlt: "Haftungsbegrenzung",
    fundort: "/agb, Abschnitt 6",
    hinweis:
      "Besondere Prüfung nötig: der Dienst wird von Menschen in belastenden Situationen genutzt, und die Antworten kommen von Laien. Eine übliche Haftungsklausel greift hier zu kurz.",
  },
  agbAenderungsvorbehalt: {
    fehlt: "Änderungsvorbehalt",
    fundort: "/agb, Abschnitt 7",
  },
  agbRechtUndGerichtsstand: {
    fehlt: "Anwendbares Recht und Gerichtsstand",
    fundort: "/agb, Abschnitt 8",
  },

  /* ---------------------------------------------------------------- */
  /* Ausstehende Volltexte                                             */
  /* ---------------------------------------------------------------- */
  textePrivacyKarten: {
    fehlt: "Volltext der neun Karten der Datenschutz-Kurzfassung",
    fundort: "/privacy",
    hinweis:
      "Als 'wird separat übergeben' angekündigt, liegt aber nicht vor. Wird unverändert übernommen, sobald er da ist.",
  },
  texteTerms: {
    fehlt: "Volltext der neun Nutzungsregeln",
    fundort: "/terms",
    hinweis: "Als 'wird separat übergeben' angekündigt, liegt aber nicht vor.",
  },
  texteHelp: {
    fehlt: "Volltext der sieben Hilfe-Karten",
    fundort: "/help",
    hinweis: "Als 'wird separat übergeben' angekündigt, liegt aber nicht vor.",
  },
  texteContact: {
    fehlt: "Volltext der Kontaktseite",
    fundort: "/contact",
    hinweis: "Als 'wird separat übergeben' angekündigt, liegt aber nicht vor.",
  },
} as const satisfies Record<string, PlaceholderEntry>;

/** Der sichtbare Wortlaut eines Platzhalters. */
export function placeholderText(id: PlaceholderId): string {
  return `[ANWALTLICH ZU PRÜFEN: ${PLACEHOLDERS[id].fehlt}]`;
}

export function allPlaceholders(): Array<PlaceholderEntry & { id: string }> {
  return Object.entries(PLACEHOLDERS).map(([id, entry]) => ({ id, ...entry }));
}
