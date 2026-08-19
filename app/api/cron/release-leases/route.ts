import { NextResponse, type NextRequest } from "next/server";

import { withServiceRole } from "@/lib/db/client";

/**
 * Gibt abgelaufene Zuweisungen zurueck in den Wartezustand.
 *
 * Ohne diesen Job haengen abgebrochene Zuweisungen dauerhaft: wer die Seite
 * schliesst, ohne zu antworten, blockiert den Brief sonst fuer immer. Im
 * Altsystem lief die Rueckgabe im Browser und griff nur, wenn zufaellig jemand
 * die Zuhoeren-Seite oeffnete.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    // Kein stiller Durchlass: ohne gesetztes Geheimnis bleibt der Endpunkt zu.
    console.error("[cron] CRON_SECRET ist nicht gesetzt, Aufruf abgewiesen.");
    return false;
  }

  const header = request.headers.get("authorization");

  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json(
      { error: "Nicht autorisiert." },
      { status: 401 },
    );
  }

  try {
    /*
     * ACHTUNG: withServiceRole umgeht Row Level Security vollstaendig.
     *
     * Dies ist die einzige Stelle der Anwendung ausserhalb des Anmeldevorgangs,
     * an der das zulaessig ist, und der Grund ist genau umrissen: der Job
     * gehoert keinem Nutzer, laeuft also ohne app.current_user_id und muss
     * Briefe fremder Konten anfassen.
     *
     * Der Endpunkt nimmt keinerlei Nutzereingabe entgegen. Es gibt weder einen
     * Parameter noch einen Body, der in die Abfrage wandert - deshalb laesst
     * sich hier auch nichts unterschieben.
     */
    const released = await withServiceRole(async (_db, client) => {
      const { rows } = await client.query<{ released: number }>(
        `SELECT release_expired_leases() AS released`,
      );

      return rows[0]?.released ?? 0;
    });

    if (released > 0) {
      console.info(
        "[cron] Zuweisungen freigegeben",
        JSON.stringify({ released }),
      );
    }

    return NextResponse.json({ released });
  } catch (error) {
    console.error("[cron] Freigabe abgelaufener Zuweisungen fehlgeschlagen", error);

    return NextResponse.json(
      { error: "Freigabe fehlgeschlagen." },
      { status: 500 },
    );
  }
}
