import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { loadMigrations, migrateDown, migrateUp } from "@/db/migrate";
import * as schema from "@/db/schema";
import { runSeed } from "@/db/seed";

import { startTestDatabase, type TestDatabase } from "./harness";

/**
 * Prueft die beiden Zusagen, die sich sonst nur behaupten liessen:
 * jede Migration ist einzeln ruecknehmbar, und der Seed erzeugt genau den
 * beschriebenen Datenbestand.
 */

let database: TestDatabase;
let owner: Client;
let pool: Pool;

beforeAll(async () => {
  database = await startTestDatabase();
  owner = new Client({ connectionString: database.ownerUrl });
  await owner.connect();

  pool = new Pool({ connectionString: database.ownerUrl });
  // Ohne diesen Listener reisst ein Verbindungsabbruch den Testprozess ab und
  // verdeckt dabei den eigentlichen Fehler.
  pool.on("error", (error) => {
    console.error("Pool-Fehler im Testlauf:", error.message);
  });
});

afterAll(async () => {
  await pool?.end().catch(() => undefined);
  await owner?.end();
  await database?.stop();
});

describe("Seed", () => {
  test("erzeugt den beschriebenen Datenbestand", async () => {
    const db = drizzle(pool, { schema });
    await runSeed(db);

    const count = async (table: string) => {
      const { rows } = await owner.query<{ n: string }>(
        `SELECT count(*) AS n FROM ${table}`,
      );
      return Number(rows[0].n);
    };

    expect(await count("categories")).toBe(8);
    expect(await count("users")).toBe(5);
    expect(await count("letters")).toBe(8);
    expect(await count("conversations")).toBe(2);
    expect(await count("messages")).toBe(7);
    expect(await count("reports")).toBe(1);
    expect(await count("blocks")).toBe(1);
    expect(await count("safety_checks")).toBe(2);

    const { rows: roles } = await owner.query<{ n: string }>(
      `SELECT count(*) AS n FROM users WHERE role = 'moderator'`,
    );
    expect(Number(roles[0].n)).toBe(1);

    const { rows: banned } = await owner.query<{ n: string }>(
      `SELECT count(*) AS n FROM users WHERE banned_at IS NOT NULL`,
    );
    expect(Number(banned[0].n)).toBe(1);

    const { rows: originals } = await owner.query<{ n: string }>(
      `SELECT count(*) AS n FROM messages WHERE is_original`,
    );
    expect(Number(originals[0].n)).toBe(2);

    // Alle vier Briefzustaende sind vertreten.
    const { rows: statuses } = await owner.query<{ status: string }>(
      `SELECT DISTINCT status::text AS status FROM letters ORDER BY status`,
    );
    expect(statuses.map((row) => row.status)).toEqual([
      "answered",
      "flagged",
      "in_progress",
      "waiting",
    ]);

    // Umlaute ueberstehen den Weg in die Datenbank.
    const { rows: label } = await owner.query<{ label: string }>(
      `SELECT label FROM categories WHERE slug = 'persoenliches'`,
    );
    expect(label[0].label).toBe("Persönliches");

    // Genau eine Zuweisung im Seed ist abgelaufen, eine weitere laeuft noch.
    const { rows: released } = await owner.query<{ n: number }>(
      `SELECT release_expired_leases() AS n`,
    );
    expect(released[0].n).toBe(1);
  });
});

describe("Migrationen", () => {
  test("jede Migration hat eine down-Datei", async () => {
    const migrations = await loadMigrations();
    expect(migrations.length).toBeGreaterThan(0);
    // loadMigrations wirft, sobald ein down-Gegenstueck fehlt.
    expect(migrations.every((migration) => migration.downPath)).toBe(true);
  });

  test("lassen sich vollstaendig zuruecknehmen und erneut anwenden", async () => {
    const migrations = await loadMigrations();

    const rolledBack = await migrateDown(owner, migrations.length, () => undefined);
    expect(rolledBack).toBe(migrations.length);

    const { rows: tables } = await owner.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename <> 'schema_migrations'`,
    );
    expect(tables.map((row) => row.tablename)).toEqual([]);

    const { rows: enums } = await owner.query<{ typname: string }>(
      `SELECT t.typname FROM pg_type t
         JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typtype = 'e'`,
    );
    expect(enums.map((row) => row.typname)).toEqual([]);

    const { rows: appSchema } = await owner.query(
      `SELECT 1 FROM pg_namespace WHERE nspname = 'app'`,
    );
    expect(appSchema).toHaveLength(0);

    const { rows: role } = await owner.query(
      `SELECT 1 FROM pg_roles WHERE rolname = 'anomail_app'`,
    );
    expect(role).toHaveLength(0);

    const reapplied = await migrateUp(owner, () => undefined);
    expect(reapplied).toBe(migrations.length);
  });

  test("RLS ist auf jeder Tabelle mit Nutzerbezug aktiv", async () => {
    const { rows } = await owner.query<{ relname: string }>(
      `SELECT c.relname
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
        ORDER BY c.relname`,
    );

    expect(rows.map((row) => row.relname)).toEqual([
      // AP7: Beschwerdeverfahren, AP8: Pruefprotokoll.
      "appeals",
      "blocks",
      "conversations",
      "letter_categories",
      "letters",
      "messages",
      "moderation_audit_log",
      "notifications",
      "reports",
      "safety_checks",
      "users",
    ]);

    // Aktivierte RLS ohne Policy waere eine Tabelle, die niemand lesen kann -
    // und damit ein stiller Ausfall statt einer Sicherheitsgrenze.
    const { rows: withoutPolicy } = await owner.query<{ relname: string }>(
      `SELECT c.relname
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_policy p ON p.polrelid = c.oid
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
          AND p.oid IS NULL`,
    );
    expect(withoutPolicy).toHaveLength(0);
  });
});
