import net from "node:net";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";

import { migrateUp } from "@/db/migrate";

const APP_PASSWORD = "anomail_test_app";
const TEST_DATABASE = "anomail_test";

export type TestDatabase = {
  /** Verbindung als Eigentuemer. Umgeht RLS, nur fuer Migrationen und Fixtures. */
  ownerUrl: string;
  /** Verbindung als anomail_app. Unterliegt RLS - so laeuft auch die Anwendung. */
  appUrl: string;
  stop: () => Promise<void>;
};

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (typeof address === "string" || address === null) {
        server.close();
        reject(new Error("Konnte keinen freien Port ermitteln."));
        return;
      }

      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

/**
 * Startet eine echte PostgreSQL-Instanz fuer die Tests.
 *
 * Echt und nicht nachgebildet, weil sich weder Row Level Security noch
 * FOR UPDATE SKIP LOCKED in einem In-Memory-Ersatz pruefen lassen. Genau diese
 * beiden Mechanismen sind aber das, was hier abgesichert werden soll.
 */
export async function startTestDatabase(): Promise<TestDatabase> {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "anomail-pg-"));
  const port = await findFreePort();

  const postgres = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: false,
  });

  await postgres.initialise();
  await postgres.start();

  // Der Cluster wird unter Windows mit WIN1252 initialisiert. Die Testdatenbank
  // bekommt deshalb ausdruecklich UTF8, sonst brechen die deutschen Umlaute in
  // den Seed- und Fixture-Texten.
  const bootstrap = new Client({
    host: "127.0.0.1",
    port,
    user: "postgres",
    password: "postgres",
    database: "postgres",
  });
  await bootstrap.connect();
  await bootstrap.query(
    `CREATE DATABASE ${TEST_DATABASE}
       WITH ENCODING 'UTF8'
            TEMPLATE template0
            LC_COLLATE 'C'
            LC_CTYPE 'C'`,
  );
  await bootstrap.end();

  const ownerUrl = `postgres://postgres:postgres@127.0.0.1:${port}/${TEST_DATABASE}`;

  const owner = new Client({ connectionString: ownerUrl });
  await owner.connect();

  try {
    await migrateUp(owner, () => undefined);
    await owner.query(
      `ALTER ROLE anomail_app WITH PASSWORD '${APP_PASSWORD}'`,
    );
  } finally {
    await owner.end();
  }

  const appUrl = `postgres://anomail_app:${APP_PASSWORD}@127.0.0.1:${port}/${TEST_DATABASE}`;

  return {
    ownerUrl,
    appUrl,
    stop: async () => {
      await postgres.stop();
      await fs.rm(dataDir, { recursive: true, force: true });
    },
  };
}

/** Verbindung, die RLS unterliegt, mit gesetztem Sitzungsnutzer. */
export async function connectAs(
  appUrl: string,
  userId: string | null,
): Promise<Client> {
  const client = new Client({ connectionString: appUrl });
  await client.connect();

  if (userId) {
    await client.query("SELECT set_config('app.current_user_id', $1, false)", [
      userId,
    ]);
  }

  return client;
}

const ANOMAIL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Stellt eine Zahl im Anomail-Alphabet dar, feste Laenge, Basis 32. */
function encodeBlock(value: number, length = 4): string {
  let out = "";
  let rest = Math.abs(Math.trunc(value));

  for (let index = 0; index < length; index += 1) {
    out = ANOMAIL_ALPHABET[rest % ANOMAIL_ALPHABET.length] + out;
    rest = Math.floor(rest / ANOMAIL_ALPHABET.length);
  }

  return out;
}

let userCounter = 0;

/** Legt einen Nutzer als Eigentuemer an, also an RLS vorbei. */
export async function createUser(
  owner: Client,
  options: { role?: "user" | "moderator" | "admin" } = {},
): Promise<{ id: string; email: string; anomailId: string }> {
  userCounter += 1;

  // Der Zaehler steckt im ersten Block, damit die Kennung eindeutig bleibt,
  // auch wenn zwischen den Tests geleert wird.
  const anomailId = `AN-${encodeBlock(userCounter)}-${encodeBlock(userCounter * 31 + 7)}`;
  const email = `test-${userCounter}@example.test`;

  const { rows } = await owner.query<{ id: string }>(
    `INSERT INTO users (email, anomail_id, role)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [email, anomailId, options.role ?? "user"],
  );

  return { id: rows[0].id, email, anomailId };
}

/** Leert alle Anwendungstabellen zwischen den Tests. */
export async function truncateAll(owner: Client): Promise<void> {
  await owner.query(`
    TRUNCATE TABLE
      safety_checks, notifications, blocks, reports,
      messages, conversations, letter_categories, letters, categories, users
    RESTART IDENTITY CASCADE
  `);
}
