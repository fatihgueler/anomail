/**
 * Die Routentabelle der Barrierefreiheitspruefung.
 *
 * Sie ist die eine Stelle, an der steht, welche Seiten geprueft werden. Eine
 * neue Route muss hier eintragen werden, sonst faellt der Vollstaendigkeits-
 * test in axe.spec.ts durch - damit eine Seite nicht unbemerkt ungeprueft
 * bleibt.
 */

export type Sitzung = "anonym" | "nutzer" | "moderation";

export type Route = {
  /** Pfad, oder "dynamisch" mit einem Platzhalter, den die Suite ersetzt. */
  pfad: string;
  sitzung: Sitzung;
  /** Wofuer die Seite da ist - erscheint im Testnamen und im Bericht. */
  zweck: string;
  /**
   * Seiten, die absichtlich nicht Teil der Nutzeroberflaeche sind. Sie werden
   * geprueft, zaehlen aber nicht als ausgelieferte Seite.
   */
  intern?: true;
  /**
   * Ziel einer Weiterleitung. Die Suite wartet dann darauf, dass die
   * Navigation abgeschlossen ist - sonst laeuft axe in eine Seite hinein, die
   * gerade ausgetauscht wird.
   */
  leitetWeiterNach?: string;
};

export const ROUTEN: Route[] = [
  // Oeffentlich
  { pfad: "/", sitzung: "anonym", zweck: "Startseite" },
  { pfad: "/login", sitzung: "anonym", zweck: "Anmeldung" },
  { pfad: "/login/check", sitzung: "anonym", zweck: "Hinweis nach Anmeldeversuch" },
  { pfad: "/login/error", sitzung: "anonym", zweck: "Fehlgeschlagene Anmeldung" },
  { pfad: "/help", sitzung: "anonym", zweck: "Hilfe" },
  { pfad: "/contact", sitzung: "anonym", zweck: "Kontakt" },
  { pfad: "/impressum", sitzung: "anonym", zweck: "Impressum" },
  { pfad: "/privacy", sitzung: "anonym", zweck: "Datenschutz, Kurzfassung" },
  { pfad: "/privacy/vollstaendig", sitzung: "anonym", zweck: "Datenschutz, Langfassung" },
  { pfad: "/terms", sitzung: "anonym", zweck: "Nutzungsregeln" },
  { pfad: "/agb", sitzung: "anonym", zweck: "Nutzungsbedingungen" },
  { pfad: "/nicht-vorhanden-fuer-die-pruefung", sitzung: "anonym", zweck: "404-Seite" },

  // Angemeldet
  { pfad: "/write", sitzung: "nutzer", zweck: "Brief schreiben" },
  { pfad: "/sent", sitzung: "nutzer", zweck: "Brief abgeschickt" },
  { pfad: "/listen", sitzung: "nutzer", zweck: "Zuhoeren" },
  { pfad: "/response-sent", sitzung: "nutzer", zweck: "Antwort abgeschickt" },
  { pfad: "/my-letters", sitzung: "nutzer", zweck: "Eigene Briefe" },
  { pfad: "/conversation/{gespraech}", sitzung: "nutzer", zweck: "Gespraech" },
  { pfad: "/notifications", sitzung: "nutzer", zweck: "Benachrichtigungen" },
  { pfad: "/my-reports", sitzung: "nutzer", zweck: "Eigene Meldungen" },
  { pfad: "/blocked", sitzung: "nutzer", zweck: "Blockierte Kennungen" },
  { pfad: "/settings", sitzung: "nutzer", zweck: "Einstellungen" },
  { pfad: "/anomail-id", sitzung: "nutzer", zweck: "Eigene Kennung" },
  { pfad: "/delete-account", sitzung: "nutzer", zweck: "Konto loeschen" },
  { pfad: "/account-geloescht", sitzung: "anonym", zweck: "Konto geloescht" },
  { pfad: "/suspended", sitzung: "nutzer", zweck: "Konto gesperrt" },

  // Moderation
  {
    pfad: "/moderation",
    sitzung: "moderation",
    zweck: "Moderation, Uebersicht",
    leitetWeiterNach: "/moderation/reports",
  },
  { pfad: "/moderation/reports", sitzung: "moderation", zweck: "Moderation, Meldungen" },
  { pfad: "/moderation/safety", sitzung: "moderation", zweck: "Moderation, Sicherheit" },
  { pfad: "/moderation/letters", sitzung: "moderation", zweck: "Moderation, Briefe" },
  { pfad: "/moderation/responses", sitzung: "moderation", zweck: "Moderation, Antworten" },
  { pfad: "/moderation/appeals", sitzung: "moderation", zweck: "Moderation, Widersprueche" },
  { pfad: "/moderation/audit", sitzung: "moderation", zweck: "Moderation, Protokoll" },

  // Entwickleransichten. Nicht Teil der Nutzeroberflaeche, aber sie sollen
  // nicht unbemerkt verfallen.
  { pfad: "/dev/ui", sitzung: "anonym", zweck: "Komponentenschau", intern: true },
  { pfad: "/dev/legal", sitzung: "anonym", zweck: "Platzhalteruebersicht", intern: true },
];
