/**
 * Gibt abgelaufene Briefzuweisungen frei.
 *
 * Dieselbe Aufgabe wie GET /api/cron/release-leases, nur ohne Umweg ueber HTTP.
 * Auf Vercel uebernimmt der Endpunkt die Arbeit (siehe vercel.json); auf
 * Railway laeuft stattdessen ein eigener Cron-Dienst, der dieses Skript
 * aufruft. Direkt an der Datenbank spart den Endpunkt, das Geheimnis und die
 * Frage, ob der Webdienst gerade erreichbar ist.
 *
 * Der Job gehoert keinem Nutzer. Er laeuft deshalb als Eigentuemer, ohne
 * app.current_user_id, und fasst Briefe fremder Konten an - genau wie der
 * Endpunkt. Er nimmt keinerlei Eingabe entgegen.
 *
 * Aufruf:  npx tsx scripts/cron-release-leases.mts
 */
import { Client } from "pg";

const DATENBANK_URL = process.env.DATABASE_URL;

if (!DATENBANK_URL) {
  console.error("DATABASE_URL fehlt.");
  process.exit(1);
}

const client = new Client({ connectionString: DATENBANK_URL });

try {
  await client.connect();

  const { rows } = await client.query<{ released: number }>(
    `SELECT release_expired_leases() AS released`,
  );

  const freigegeben = rows[0]?.released ?? 0;

  if (freigegeben > 0) {
    console.info(`[cron] ${freigegeben} Zuweisungen freigegeben.`);
  }
} catch (error) {
  // Nicht verschlucken: ein stiller Fehlschlag hiesse, dass Briefe dauerhaft
  // haengen bleiben, ohne dass es jemand merkt.
  console.error("[cron] Freigabe abgelaufener Zuweisungen fehlgeschlagen", error);
  process.exit(1);
} finally {
  await client.end().catch(() => {
    // Die Verbindung war schon zu. Das aendert am Ergebnis nichts.
  });
}
