import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  MissingUserContextError,
  closePools,
  withUser,
} from "@/lib/db/client";
import { letters } from "@/db/schema";

import {
  createUser,
  startTestDatabase,
  truncateAll,
  type TestDatabase,
} from "../db/harness";

/**
 * Die Bruecke von der Session zur RLS-Policy.
 *
 * Geprueft wird nicht, dass der gute Fall funktioniert, sondern dass der
 * schlechte Fall nicht durchrutscht: ohne Kontext gibt es keine Daten, und der
 * Kontext bleibt nicht an der Verbindung haengen.
 */

let database: TestDatabase;
let owner: Client;

beforeAll(async () => {
  database = await startTestDatabase();
  owner = new Client({ connectionString: database.ownerUrl });
  await owner.connect();

  process.env.DATABASE_URL = database.ownerUrl;
  process.env.DATABASE_URL_APP = database.appUrl;
});

afterAll(async () => {
  await closePools();
  await owner?.end();
  await database?.stop();
});

beforeEach(async () => {
  await truncateAll(owner);
});

describe("1 - Abfrage ohne Sitzungskontext", () => {
  test("withUser ohne Session wirft, statt irgendetwas zu liefern", async () => {
    await expect(
      withUser(null, async (db) => db.select().from(letters)),
    ).rejects.toBeInstanceOf(MissingUserContextError);

    await expect(
      withUser({ user: null }, async (db) => db.select().from(letters)),
    ).rejects.toBeInstanceOf(MissingUserContextError);

    await expect(
      withUser({ user: { id: null } }, async (db) => db.select().from(letters)),
    ).rejects.toBeInstanceOf(MissingUserContextError);
  });

  test("selbst wenn der Kontext fehlte, kaeme nichts Ungefiltertes zurueck", async () => {
    const author = await createUser(owner);
    await owner.query(
      `INSERT INTO letters (author_id, content, status)
       VALUES ($1, 'Platzhaltertext für einen Testbrief.', 'answered')`,
      [author.id],
    );

    // Gegenprobe zur Behauptung "ohne Kontext liefert die Abfrage zu viel":
    // die Verbindung ohne gesetzte Variable sieht null Zeilen, nicht alle.
    const bare = new Client({ connectionString: database.appUrl });
    await bare.connect();

    try {
      const result = await bare.query(`SELECT id FROM letters`);
      expect(result.rowCount).toBe(0);
    } finally {
      await bare.end();
    }

    // Und mit Kontext sieht der Autor seinen Brief sehr wohl.
    const visible = await withUser({ user: { id: author.id } }, async (db) =>
      db.select().from(letters),
    );
    expect(visible).toHaveLength(1);
  });
});

describe("2 - SET LOCAL bleibt nicht an der Verbindung haengen", () => {
  test("die naechste Transaktion derselben Verbindung sieht die Variable nicht mehr", async () => {
    // max: 1 erzwingt, dass beide Transaktionen dieselbe physische Verbindung
    // bekommen. Ohne das wuerde der Test zufaellig bestehen.
    const pool = new Pool({ connectionString: database.appUrl, max: 1 });

    try {
      const first = await pool.connect();
      const firstPid = (await first.query<{ pid: number }>(
        `SELECT pg_backend_pid() AS pid`,
      )).rows[0].pid;

      await first.query("BEGIN");
      await first.query(
        "SELECT set_config('app.current_user_id', $1, true)",
        ["11111111-1111-1111-1111-111111111111"],
      );

      const inside = await first.query<{ value: string | null }>(
        `SELECT current_setting('app.current_user_id', true) AS value`,
      );
      expect(inside.rows[0].value).toBe("11111111-1111-1111-1111-111111111111");

      await first.query("COMMIT");
      first.release();

      const second = await pool.connect();
      const secondPid = (await second.query<{ pid: number }>(
        `SELECT pg_backend_pid() AS pid`,
      )).rows[0].pid;

      // Nur aussagekraeftig, wenn es wirklich dieselbe Verbindung ist.
      expect(secondPid).toBe(firstPid);

      await second.query("BEGIN");
      const after = await second.query<{ value: string | null }>(
        `SELECT current_setting('app.current_user_id', true) AS value`,
      );
      await second.query("COMMIT");
      second.release();

      // Leerer String oder NULL - in beiden Faellen kein uebernommener Nutzer.
      expect(after.rows[0].value ?? "").toBe("");
    } finally {
      await pool.end();
    }
  });
});
