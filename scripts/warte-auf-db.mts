/**
 * Wartet, bis die lokale Entwicklungsdatenbank bereit ist.
 *
 * Gebraucht in der CI: scripts/local-dev-db.mts laeuft im Hintergrund und
 * braucht einen Moment, bis Migrationen, Beispieldaten und .env.local stehen.
 * Ein festes Warteintervall waere entweder zu kurz oder verschenkte Zeit.
 *
 * Geprueft wird nicht der Port, sondern .env.local samt einer Abfrage: der
 * Port ist bereits offen, waehrend die Beispieldaten noch entstehen.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";

const FRIST_MS = 180_000;
const ABSTAND_MS = 1_000;

const beginn = Date.now();
let letzterFehler: unknown;

while (Date.now() - beginn < FRIST_MS) {
  try {
    const env = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
    const treffer = env.match(/^DATABASE_URL=(.+)$/m);

    if (!treffer) {
      throw new Error("DATABASE_URL steht noch nicht in .env.local.");
    }

    const client = new Client({ connectionString: treffer[1].trim() });
    await client.connect();

    try {
      const { rows } = await client.query<{ anzahl: string }>(
        `SELECT count(*)::text AS anzahl FROM sessions`,
      );

      if (Number(rows[0].anzahl) < 2) {
        throw new Error("Die Beispielsitzungen fehlen noch.");
      }
    } finally {
      await client.end();
    }

    console.log(
      `Datenbank bereit nach ${Math.round((Date.now() - beginn) / 1000)} Sekunden.`,
    );
    process.exit(0);
  } catch (error) {
    // Noch nicht so weit. Der Fehler wird aufgehoben und nur gemeldet, wenn
    // die Frist ablaeuft - ein leerer catch wuerde die Ursache verschlucken.
    letzterFehler = error;
    await new Promise((fertig) => setTimeout(fertig, ABSTAND_MS));
  }
}

console.error(
  "Die Datenbank war nach der Frist nicht bereit. Letzter Fehler:",
  letzterFehler instanceof Error ? letzterFehler.message : String(letzterFehler),
);
process.exit(1);
