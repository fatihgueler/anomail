import { NextResponse } from "next/server";

/**
 * Lebenszeichen fuer den Betreiber.
 *
 * Beantwortet genau eine Frage: nimmt dieser Prozess HTTP-Anfragen entgegen?
 * Ausdruecklich nicht, ob die Datenbank erreichbar ist.
 *
 * Der Unterschied ist beim Ausrollen entscheidend. Vorher zeigte der
 * Healthcheck auf "/", und diese Seite braucht seit dem Redesign bei jedem
 * Aufruf Sitzung und Datenbank. Ist die Datenbank beim Start eines neuen
 * Containers noch nicht so weit, faellt der Healthcheck durch, Railway
 * wiederholt ihn fuenf Minuten lang und startet danach neu - dreimal. Das
 * Ausrollen stand deshalb ueber zwanzig Minuten, ohne dass etwas kaputt war.
 *
 * Ein Healthcheck, der die ganze Abhaengigkeitskette prueft, verhindert
 * genau dann das Ausrollen, wenn man es am dringendsten braucht: waehrend
 * einer Stoerung.
 *
 * Wer wissen will, ob die Datenbank steht, sieht in die Anwendung - dort
 * faellt es sofort auf. Hier nicht.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
