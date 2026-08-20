/**
 * Bringt eine frisch bereitgestellte Datenbank in den betriebsbereiten Zustand.
 *
 * Laeuft als Release-Schritt bei jedem Ausrollen (siehe railway.json). Drei
 * Dinge, und ausdruecklich nur diese drei:
 *
 *   1. Migrationen anwenden.
 *   2. Der Rolle anomail_app ein Passwort geben. Die Migration legt die Rolle
 *      an, aber ein Passwort gehoert nicht in eine Migration - es stuende sonst
 *      im Repository.
 *   3. Die Kategorien anlegen, falls sie fehlen.
 *
 * Was hier NICHT passiert: db/seed.ts. Der leert vorher alle Tabellen; auf
 * einer laufenden Instanz waere das ein Datenverlust bei jedem Ausrollen.
 *
 * Steht DEMO_DATEN auf "true", kommt ein vierter Schritt dazu und legt
 * wartende Briefe fuer eine Vorfuehrinstanz an - der loescht nichts. Auf
 * Railway ist das der einzige Weg dorthin, ohne die Datenbank oeffentlich
 * erreichbar zu machen.
 *
 * Das Skript ist mehrfach ausfuehrbar: nichts darin haengt davon ab, dass es
 * das erste Mal laeuft.
 */
import { Client } from "pg";

import { migrateUp } from "../db/migrate";
import { CATEGORY_SEED } from "../db/seed";

const DATENBANK_URL = process.env.DATABASE_URL;
const APP_PASSWORT = process.env.APP_DB_PASSWORD;

if (!DATENBANK_URL) {
  console.error(
    "DATABASE_URL fehlt. Migrationen laufen als Eigentuemer, nicht als anomail_app.",
  );
  process.exit(1);
}

if (!APP_PASSWORT) {
  console.error(
    [
      "APP_DB_PASSWORD fehlt.",
      "",
      "Die Anwendung verbindet sich als Rolle anomail_app, damit Row Level",
      "Security greift. Ohne Passwort fuer diese Rolle kaeme die Anwendung",
      "nicht an die Datenbank. Setze APP_DB_PASSWORD und DATABASE_URL_APP auf",
      "dasselbe Passwort.",
    ].join("\n"),
  );
  process.exit(1);
}

const client = new Client({ connectionString: DATENBANK_URL });
await client.connect();

try {
  console.log("1/3  Migrationen");
  const angewendet = await migrateUp(client);
  console.log(
    angewendet === 0
      ? "     Nichts anzuwenden, Stand ist aktuell."
      : `     ${angewendet} angewendet.`,
  );

  console.log("2/3  Passwort der Anwendungsrolle");
  // Kein Parameter moeglich: ALTER ROLE nimmt das Passwort nur als Literal.
  // Deshalb von Hand maskiert - einfache Anfuehrungszeichen verdoppeln.
  const maskiert = APP_PASSWORT.replace(/'/g, "''");
  await client.query(`ALTER ROLE anomail_app WITH LOGIN PASSWORD '${maskiert}'`);
  console.log("     Gesetzt.");

  console.log("3/3  Kategorien");
  const { rowCount } = await client.query(
    `INSERT INTO categories (slug, label)
     SELECT * FROM unnest($1::text[], $2::text[])
     ON CONFLICT (slug) DO NOTHING`,
    [
      CATEGORY_SEED.map((eintrag) => eintrag.slug),
      CATEGORY_SEED.map((eintrag) => eintrag.label),
    ],
  );
  console.log(
    rowCount === 0
      ? "     Alle vorhanden."
      : `     ${rowCount} angelegt.`,
  );

  if (process.env.DEMO_DATEN === "true") {
    console.log("4/4  Vorfuehrdaten (DEMO_DATEN=true)");
    const { legeDemoDatenAn } = await import("./demo-daten.mts");
    const angelegt = await legeDemoDatenAn(client);
    console.log(
      angelegt === 0 ? "     Waren schon da." : `     ${angelegt} Briefe angelegt.`,
    );
  }

  if (process.env.DEMO_ZUGANG === "true") {
    console.log("5/5  Vorfuehr-Zugang (DEMO_ZUGANG=true)");

    const geheimnis = process.env.DEMO_ZUGANG_TOKEN;

    if (!geheimnis) {
      throw new Error(
        "DEMO_ZUGANG=true, aber DEMO_ZUGANG_TOKEN fehlt. Ohne Geheimnis kein Zugang.",
      );
    }

    const { richteDemoZugangEin } = await import("./demo-zugang.mts");
    const sitzungen = await richteDemoZugangEin(client, geheimnis);

    console.log("");
    console.log("     ACHTUNG: Diese Instanz hat feste Vorfuehr-Sitzungen.");
    console.log("     Wer das Cookie kennt, ist ohne Anmeldung drin.");
    console.log("     Zum Abschalten DEMO_ZUGANG entfernen und neu ausrollen.");
    console.log("");

    for (const sitzung of sitzungen) {
      console.log(`     ${sitzung.beschreibung}: ${sitzung.anomailId}`);
    }
  } else {
    const { raeumeDemoZugangAuf } = await import("./demo-zugang.mts");
    const entfernt = await raeumeDemoZugangAuf(client);

    if (entfernt > 0) {
      console.log(`5/5  Vorfuehr-Zugang abgeschaltet, ${entfernt} Sitzungen entfernt.`);
    }
  }

  console.log("\nDatenbank ist betriebsbereit.");
} finally {
  await client.end();
}
