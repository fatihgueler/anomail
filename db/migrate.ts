import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Client } from "pg";

const MIGRATIONS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

const MIGRATIONS_TABLE = "schema_migrations";

export type Migration = {
  version: string;
  name: string;
  upPath: string;
  downPath: string;
};

/** Liest alle Migrationen und stellt sicher, dass jede ein down-Gegenstueck hat. */
export async function loadMigrations(): Promise<Migration[]> {
  const entries = await fs.readdir(MIGRATIONS_DIR);
  const ups = entries.filter((file) => file.endsWith(".up.sql")).sort();

  const migrations: Migration[] = [];

  for (const up of ups) {
    const base = up.replace(/\.up\.sql$/, "");
    const down = `${base}.down.sql`;

    if (!entries.includes(down)) {
      throw new Error(
        `Migration ${base} hat keine down-Datei. Jede Migration muss einzeln ruecknehmbar sein.`,
      );
    }

    const [version, ...rest] = base.split("_");
    migrations.push({
      version,
      name: rest.join("_"),
      upPath: path.join(MIGRATIONS_DIR, up),
      downPath: path.join(MIGRATIONS_DIR, down),
    });
  }

  return migrations;
}

async function ensureMigrationsTable(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      version    text        PRIMARY KEY,
      name       text        NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function appliedVersions(client: Client): Promise<Set<string>> {
  const { rows } = await client.query<{ version: string }>(
    `SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version`,
  );
  return new Set(rows.map((row) => row.version));
}

/**
 * Fuehrt jede ausstehende Migration in einer eigenen Transaktion aus.
 * Schlaegt eine fehl, bleibt der Stand davor unveraendert bestehen.
 */
export async function migrateUp(client: Client, log = console.log) {
  await ensureMigrationsTable(client);
  const applied = await appliedVersions(client);
  const migrations = await loadMigrations();

  let count = 0;

  for (const migration of migrations) {
    if (applied.has(migration.version)) {
      continue;
    }

    const sql = await fs.readFile(migration.upPath, "utf8");

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (version, name) VALUES ($1, $2)`,
        [migration.version, migration.name],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(
        `Migration ${migration.version}_${migration.name} fehlgeschlagen: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error },
      );
    }

    log(`  up   ${migration.version}_${migration.name}`);
    count += 1;
  }

  return count;
}

/** Nimmt die letzten n Migrationen zurueck, in umgekehrter Reihenfolge. */
export async function migrateDown(client: Client, steps = 1, log = console.log) {
  await ensureMigrationsTable(client);
  const applied = await appliedVersions(client);
  const migrations = await loadMigrations();

  const pending = migrations
    .filter((migration) => applied.has(migration.version))
    .reverse()
    .slice(0, steps);

  for (const migration of pending) {
    const sql = await fs.readFile(migration.downPath, "utf8");

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        `DELETE FROM ${MIGRATIONS_TABLE} WHERE version = $1`,
        [migration.version],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(
        `Ruecknahme von ${migration.version}_${migration.name} fehlgeschlagen: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error },
      );
    }

    log(`  down ${migration.version}_${migration.name}`);
  }

  return pending.length;
}

async function status(client: Client) {
  await ensureMigrationsTable(client);
  const applied = await appliedVersions(client);
  const migrations = await loadMigrations();

  for (const migration of migrations) {
    const mark = applied.has(migration.version) ? "x" : " ";
    console.log(`  [${mark}] ${migration.version}_${migration.name}`);
  }
}

async function main() {
  const { config } = await import("dotenv");
  config();

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL fehlt. Migrationen laufen als Eigentuemer, nicht als anomail_app.",
    );
  }

  const command = process.argv[2] ?? "up";
  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    if (command === "up") {
      const count = await migrateUp(client);
      console.log(count === 0 ? "Nichts anzuwenden." : `${count} angewendet.`);
    } else if (command === "down") {
      const steps = Number.parseInt(process.argv[3] ?? "1", 10);
      const count = await migrateDown(client, steps);
      console.log(`${count} zurueckgenommen.`);
    } else if (command === "status") {
      await status(client);
    } else {
      throw new Error(`Unbekannter Befehl "${command}". Erlaubt: up, down, status.`);
    }
  } finally {
    await client.end();
  }
}

// Nur ausfuehren, wenn direkt aufgerufen - nicht beim Import aus den Tests.
// pathToFileURL statt Handarbeit, sonst stimmt die Anzahl der Schraegstriche
// unter Windows nicht mit import.meta.url ueberein.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
