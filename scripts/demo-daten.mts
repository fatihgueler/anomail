/**
 * Legt Inhalte fuer eine Vorfuehrinstanz an.
 *
 * Zweck: Wer sich neu anmeldet, findet unter /listen etwas vor. Ohne wartende
 * Briefe zeigt die Vorfuehrung nur Leerzustaende.
 *
 * Ausdruecklich nicht db/seed.ts: der leert vorher alle Tabellen. Hier wird
 * nichts geloescht und nichts ueberschrieben. Mehrfaches Ausfuehren legt nicht
 * doppelt an, weil jeder Brief an einer festen Kennung haengt.
 *
 * Die Texte sind bewusst unauffaellige Platzhalter. Erfundene Krisen-
 * schilderungen haetten in einem Vorfuehrdatensatz nichts zu suchen.
 *
 * Aufruf:  npx tsx scripts/demo-daten.mts
 */
import { Client } from "pg";

const DATENBANK_URL = process.env.DATABASE_URL;

if (!DATENBANK_URL) {
  console.error("DATABASE_URL fehlt.");
  process.exit(1);
}

/**
 * Feste Kennung, damit ein zweiter Lauf denselben Autor wiedererkennt.
 *
 * Das Alphabet der Anomail-ID laesst I, O, 0 und 1 aus, damit sich niemand
 * beim Abtippen vertut - "DEMO" ist deshalb keine gueltige Kennung.
 */
const DEMO_AUTOR = {
  email: "demo-autor@anomail.invalid",
  anomailId: "AN-DEMA-2345",
};

const BRIEFE = [
  {
    marke: "demo-1",
    kategorien: ["einsamkeit", "hoffnung"],
    text: "Ich bin vor vier Monaten in eine andere Stadt gezogen. Auf der Arbeit läuft es, aber abends sitze ich da und merke, dass ich seit Wochen mit niemandem geredet habe, der mich kennt. Ich weiß nicht recht, wie man das als Erwachsener wieder anfängt.",
  },
  {
    marke: "demo-2",
    kategorien: ["familie"],
    text: "Meine Mutter ruft jeden Sonntag an, und jedes Mal endet es damit, dass ich mich schlecht fühle. Sie meint es nicht böse, glaube ich. Aber ich lege auf und brauche den halben Abend, um wieder runterzukommen. Ich weiß nicht, wie ich das ansprechen soll.",
  },
  {
    marke: "demo-3",
    kategorien: ["arbeit"],
    text: "Ich mache meinen Job seit sechs Jahren und bin gut darin. Trotzdem habe ich jeden Morgen dieses Ziehen im Bauch, bevor ich den Rechner aufklappe. Von außen sieht alles in Ordnung aus, und genau das macht es schwer, überhaupt davon anzufangen.",
  },
  {
    marke: "demo-4",
    kategorien: ["beziehung", "persoenliches"],
    text: "Wir sind seit drei Jahren zusammen und streiten kaum. Aber in letzter Zeit sitzen wir abends nebeneinander und sagen nichts, und es fühlt sich nicht mehr nach Ruhe an, sondern nach Abstand. Ich traue mich nicht zu fragen, ob es ihm auch so geht.",
  },
];

const client = new Client({ connectionString: DATENBANK_URL });
await client.connect();

try {
  const { rows: autoren } = await client.query<{ id: string }>(
    `INSERT INTO users (email, anomail_id)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [DEMO_AUTOR.email, DEMO_AUTOR.anomailId],
  );

  const autorId = autoren[0].id;
  let angelegt = 0;

  for (const brief of BRIEFE) {
    // Die Marke steht unsichtbar in submission_id: sie ist bereits eindeutig
    // gedacht und erspart eine eigene Spalte nur fuer die Vorfuehrung.
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO letters (author_id, content, status, submission_id, created_at)
       SELECT $1, $2, 'waiting', $3::uuid, now() - ($4 || ' hours')::interval
       WHERE NOT EXISTS (
         SELECT 1 FROM letters WHERE submission_id = $3::uuid
       )
       RETURNING id`,
      [
        autorId,
        brief.text,
        markeAlsUuid(brief.marke),
        String(BRIEFE.indexOf(brief) + 1),
      ],
    );

    if (rows.length === 0) {
      continue;
    }

    angelegt += 1;

    await client.query(
      `INSERT INTO letter_categories (letter_id, category_id)
       SELECT $1, id FROM categories WHERE slug = ANY($2::text[])`,
      [rows[0].id, brief.kategorien],
    );
  }

  console.log(
    angelegt === 0
      ? "Die Vorfuehrbriefe waren schon da. Nichts geaendert."
      : `${angelegt} Vorfuehrbriefe angelegt.`,
  );
} finally {
  await client.end();
}

/**
 * Macht aus einer Marke wie "demo-1" eine feste UUID.
 *
 * submission_id ist vom Typ uuid. Eine gerechnete, immer gleiche UUID haelt
 * den Lauf wiederholbar, ohne dass eine Zuordnungstabelle noetig waere.
 */
function markeAlsUuid(marke: string): string {
  const ziffern = marke.replace(/\D/g, "").padStart(2, "0").slice(0, 2);
  return `de70de70-0000-4000-8000-0000000000${ziffern}`;
}
