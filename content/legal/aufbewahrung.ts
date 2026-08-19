/**
 * Aufbewahrungsfristen.
 *
 * Karte 9 der Datenschutz-Kurzfassung sagt zu, dass einige technische
 * Sicherheits- und Moderationsdaten nach einer Kontoauflösung begrenzt
 * erhalten bleiben. "Begrenzt" braucht eine Zahl, und diese Zahl ist eine
 * rechtliche Festlegung — keine technische.
 *
 * Der Wert unten ist deshalb ausdrücklich ungeprüft. Er steht hier, damit die
 * technische Umsetzung eine konfigurierbare Frist kennt und nicht später
 * nachgerüstet werden muss. Vor dem Start ist er anwaltlich zu bestimmen; der
 * zugehörige Platzhalter ist dsgvoSpeicherdauer.
 */

/** Ungeprüfter Vorgabewert. Siehe Kommentar oben. */
export const RETENTION_DAYS = 90;

/** Was nach einer Kontoauflösung überhaupt noch aufbewahrt wird. */
export const RETAINED_AFTER_DELETION = [
  {
    bereich: "Meldungen",
    was: "Der Vorgang bleibt bestehen, der Verweis zeigt auf eine anonyme Zeile.",
  },
  {
    bereich: "Sicherheitsprüfungen",
    was: "Einstufung und Begründung bleiben, der geprüfte Text wird geleert.",
  },
  {
    bereich: "Prüfprotokoll der Moderation",
    was: "Unverändert. Es ist technisch nicht änderbar und nicht löschbar.",
  },
] as const;
