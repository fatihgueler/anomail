/**
 * Lokale Entwicklungsdatenbank.
 *
 * Startet eine eingebettete PostgreSQL-Instanz, wendet alle Migrationen an,
 * legt Beispieldaten und eine angemeldete Sitzung an und schreibt .env.local.
 * Damit ist "npm run dev" ohne weitere Einrichtung benutzbar.
 *
 * Nur fuer die Entwicklung.
 *
 * Das Skript bleibt bewusst im Vordergrund stehen: der Postgres-Prozess ist
 * ein Kind dieses Prozesses und wird mit ihm beendet. Also im Hintergrund
 * starten und laufen lassen, solange der Dev-Server laeuft.
 *
 * Beim zweiten Aufruf wird ein vorhandenes Datenverzeichnis wiederverwendet;
 * die Beispieldaten entstehen nur beim ersten Mal.
 */
import fs from "node:fs/promises";
import path from "node:path";

import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";

import { migrateUp } from "../db/migrate";

const PORT = 55432;
const DATA_DIR = path.join(process.cwd(), ".local-dev-pg");
const DATABASE = "anomail_dev";
const APP_PASSWORD = "localdev";
const SESSION_TOKEN = "local-dev-session-token";
const MODERATOR_SESSION_TOKEN = "local-dev-moderator-token";

const alreadySetUp = await fs
  .stat(path.join(DATA_DIR, "PG_VERSION"))
  .then(() => true)
  .catch(() => false);

const postgres = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
});

if (!alreadySetUp) {
  await postgres.initialise();
}

await postgres.start();

async function stop(): Promise<never> {
  await postgres.stop().catch((error: unknown) => {
    console.error("Postgres liess sich nicht sauber beenden:", error);
  });
  process.exit(0);
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

if (alreadySetUp) {
  console.log(
    `\nLokale Datenbank laeuft wieder auf Port ${PORT}. Beispieldaten bleiben erhalten.\n`,
  );
  // Offen halten, damit der Postgres-Kindprozess weiterlaeuft.
  await new Promise(() => undefined);
}

const bootstrap = new Client({
  host: "127.0.0.1",
  port: PORT,
  user: "postgres",
  password: "postgres",
  database: "postgres",
});
await bootstrap.connect();
// Der Cluster wird unter Windows mit WIN1252 angelegt. Ohne UTF8 brechen die
// Umlaute in den Beispieltexten.
await bootstrap.query(
  `CREATE DATABASE ${DATABASE} WITH ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'`,
);
await bootstrap.end();

const ownerUrl = `postgres://postgres:postgres@127.0.0.1:${PORT}/${DATABASE}`;
const appUrl = `postgres://anomail_app:${APP_PASSWORD}@127.0.0.1:${PORT}/${DATABASE}`;

const owner = new Client({ connectionString: ownerUrl });
await owner.connect();

await migrateUp(owner, () => undefined);
await owner.query(`ALTER ROLE anomail_app WITH PASSWORD '${APP_PASSWORD}'`);

for (const [slug, label] of [
  ["beziehung", "Beziehung"],
  ["familie", "Familie"],
  ["einsamkeit", "Einsamkeit"],
  ["arbeit", "Arbeit"],
  ["schule", "Schule"],
  ["hoffnung", "Hoffnung"],
  ["persoenliches", "Persönliches"],
  ["sonstiges", "Sonstiges"],
]) {
  await owner.query(`INSERT INTO categories (slug, label) VALUES ($1, $2)`, [
    slug,
    label,
  ]);
}

const { rows: users } = await owner.query<{ id: string }>(
  `INSERT INTO users (email, anomail_id, role) VALUES
     ('du@example.test',         'AN-4KTP-9WXR', 'user'),
     ('gegenueber@example.test', 'AN-7QMD-3HVZ', 'user'),
     ('dritte@example.test',     'AN-2JFN-8RKS', 'user'),
     ('moderation@example.test', 'AN-6XBT-5PQW', 'moderator')
   RETURNING id`,
);
const [me, partner, third, moderator] = users.map((row) => row.id);

const { rows: letters } = await owner.query<{ id: string }>(
  `INSERT INTO letters (author_id, content, status, created_at) VALUES
     ($1, 'Ein wartender Brief. Seit dem Umzug ist alles fremd, und ich finde schwer Anschluss. Abends ist es am deutlichsten.', 'waiting',  now() - interval '2 hours'),
     ($1, 'Ein beantworteter Brief. Ich weiss nicht, wie ich das ansprechen soll, ohne dass es gleich eskaliert.',              'answered', now() - interval '2 days'),
     ($2, 'Ein fremder Brief, damit die Zuhoeren-Seite etwas zum Zuweisen hat. Manchmal reicht es schon, wenn jemand liest.',    'waiting',  now() - interval '1 hour')
   RETURNING id`,
  [me, third],
);

await owner.query(
  `INSERT INTO letter_categories (letter_id, category_id)
   SELECT $1, id FROM categories WHERE slug IN ('einsamkeit', 'hoffnung')`,
  [letters[0].id],
);
await owner.query(
  `INSERT INTO letter_categories (letter_id, category_id)
   SELECT $1, id FROM categories WHERE slug = 'familie'`,
  [letters[1].id],
);

const { rows: conversations } = await owner.query<{ id: string }>(
  `INSERT INTO conversations (original_letter_id, participant_a_id, participant_b_id, created_at)
   VALUES ($1, $2, $3, now() - interval '2 days') RETURNING id`,
  [letters[1].id, me, partner],
);

await owner.query(
  `INSERT INTO messages (conversation_id, sender_id, content, is_original, created_at) VALUES
     ($1, $2, 'Ein beantworteter Brief. Ich weiss nicht, wie ich das ansprechen soll, ohne dass es gleich eskaliert.', true,  now() - interval '2 days'),
     ($1, $3, 'Danke, dass du das aufgeschrieben hast. Ich kenne das Zoegern davor gut.',                              false, now() - interval '1 day'),
     ($1, $2, 'Das zu lesen hat geholfen. Ich probiere es diese Woche.',                                                false, now() - interval '3 hours')`,
  [conversations[0].id, me, partner],
);

await owner.query(
  `INSERT INTO notifications (recipient_id, conversation_id, type)
   VALUES ($1, $2, 'new_response')`,
  [me, conversations[0].id],
);

// Moderationsdaten. Ohne sie zeigten die Moderationsseiten nur Leerzustaende,
// und die Barrierefreiheitspruefung saehe weder Tabellen noch Formulare.
const { rows: gemeldeteBriefe } = await owner.query<{ id: string }>(
  `INSERT INTO letters (author_id, content, status, created_at)
   VALUES ($1, 'Ein gemeldeter Brief fuer die Moderationsansicht. Der Inhalt ist harmlos; es geht nur darum, dass die Liste eine Zeile hat.', 'waiting', now() - interval '5 hours')
   RETURNING id`,
  [third],
);

await owner.query(
  `INSERT INTO reports (reporter_id, target_type, target_id, reason)
   VALUES ($1, 'letter', $2, 'beleidigung')`,
  [me, gemeldeteBriefe[0].id],
);

await owner.query(
  `INSERT INTO safety_checks
     (target_type, target_id, sender_id, content_snapshot, risk_level,
      detected_categories, should_hold, reasoning)
   VALUES ('letter', $1, $2,
           'Ein zurueckgehaltener Text fuer die Sicherheitsansicht.',
           'YELLOW', ARRAY['selbstgefaehrdung'], true,
           'Beispieldatensatz der lokalen Entwicklungsdatenbank.')`,
  [gemeldeteBriefe[0].id, third],
);

await owner.query(
  `INSERT INTO appeals (appellant_id, target_type, target_id, message)
   VALUES ($1, 'letter', $2, 'Ich halte die Entscheidung fuer falsch und bitte um erneute Pruefung.')`,
  [third, gemeldeteBriefe[0].id],
);

await owner.query(
  `INSERT INTO moderation_audit_log (actor_id, action, target_type, target_id, note)
   VALUES ($1, 'viewed', 'letter', $2, 'Beispieleintrag der lokalen Entwicklungsdatenbank.')`,
  [moderator, gemeldeteBriefe[0].id],
);

// Angemeldete Sitzungen, damit die geschuetzten Seiten ohne Magic-Link
// erreichbar sind - eine als Nutzer, eine als Moderation.
await owner.query(
  `INSERT INTO sessions (session_token, user_id, expires) VALUES
     ($1, $2, now() + interval '30 days'),
     ($3, $4, now() + interval '30 days')`,
  [SESSION_TOKEN, me, MODERATOR_SESSION_TOKEN, moderator],
);

await owner.end();

await fs.writeFile(
  path.join(process.cwd(), ".env.local"),
  [
    "# Von scripts/local-dev-db.mts erzeugt. Nur fuer die Entwicklung.",
    `DATABASE_URL=${ownerUrl}`,
    `DATABASE_URL_APP=${appUrl}`,
    "AUTH_SECRET=local-dev-secret-0123456789abcdefghijklmn",
    "AUTH_URL=http://localhost:3000",
    "AUTH_EMAIL_FROM=anmeldung@anomail.local",
    "MAIL_TRANSPORT=console",
    "SAFETY_PROVIDER=rules",
    "CRON_SECRET=local-dev-cron-secret",
    "",
  ].join("\n"),
  "utf8",
);

console.log(
  [
    "",
    "Lokale Datenbank laeuft.",
    `  Port:            ${PORT}`,
    `  Datenbank:       ${DATABASE}`,
    "  .env.local:      geschrieben",
    "",
    "Anmelden ohne Magic-Link: im Browser auf http://localhost:3000 dieses",
    "Cookie setzen, dann neu laden:",
    "",
    `  document.cookie = "authjs.session-token=${SESSION_TOKEN}; path=/"`,
    "",
    "Als Moderation:",
    "",
    `  document.cookie = "authjs.session-token=${MODERATOR_SESSION_TOKEN}; path=/"`,
    "",
    "Oder regulaer ueber /login mit du@example.test - der Link erscheint im",
    "Terminal des Dev-Servers.",
    "",
  ].join("\n"),
);

// Offen halten. Der Postgres-Prozess ist ein Kind dieses Prozesses und wuerde
// mit einem process.exit hier sofort mitsterben.
await new Promise(() => undefined);
