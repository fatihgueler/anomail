import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  ANOMAIL_ID_MAX_ATTEMPTS,
  ANOMAIL_ID_PATTERN,
  AnomailIdAssignmentError,
  generateAnomailId,
} from "@/lib/anomail-id";
import {
  createUserWithAnomailId,
  retireAnomailId,
} from "@/lib/anomail-id/assign";

import { startTestDatabase, truncateAll, type TestDatabase } from "../db/harness";

let database: TestDatabase;
let owner: Client;
let pool: Pool;

beforeAll(async () => {
  database = await startTestDatabase();
  owner = new Client({ connectionString: database.ownerUrl });
  await owner.connect();

  pool = new Pool({ connectionString: database.ownerUrl });
  pool.on("error", (error) => {
    console.error("Pool-Fehler im Testlauf:", error.message);
  });
});

afterAll(async () => {
  await pool?.end().catch(() => undefined);
  await owner?.end();
  await database?.stop();
});

beforeEach(async () => {
  await truncateAll(owner);
  await owner.query(`DELETE FROM retired_anomail_ids`);
});

/**
 * Fuehrt die Arbeit in einer echten Transaktion aus - so wie der Adapter es
 * ueber withServiceRole tut. Ohne diese Klammer liefe jeder INSERT in seiner
 * eigenen impliziten Transaktion und der Test bewiese nichts ueber das
 * Verhalten bei einer abgebrochenen Transaktion.
 */
async function inTransaction<T>(
  work: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

describe("4 - Form und Alphabet der Anomail-ID", () => {
  test("10.000 Durchlaeufe halten Format und Alphabet ein", () => {
    const verboten = /[IO01]/;
    const gesehen = new Set<string>();

    for (let index = 0; index < 10_000; index += 1) {
      const id = generateAnomailId();

      expect(id).toMatch(ANOMAIL_ID_PATTERN);
      expect(id.slice(3)).not.toMatch(verboten);

      gesehen.add(id);
    }

    // Nicht auf Eindeutigkeit pruefen - dafuer ist die Datenbank zustaendig.
    // Aber ein Erzeuger, der staendig dasselbe liefert, faellt hier auf.
    expect(gesehen.size).toBeGreaterThan(9_900);
  });

  test("das AN-Praefix bleibt unveraendert", () => {
    for (let index = 0; index < 500; index += 1) {
      expect(generateAnomailId().startsWith("AN-")).toBe(true);
    }
  });
});

describe("5 - Kollisionen bei der Erstanmeldung", () => {
  test("zwei parallele Erstanmeldungen erzeugen zwei verschiedene IDs", async () => {
    // Zwei echte, gleichzeitig offene Transaktionen auf getrennten
    // Verbindungen. Nacheinander gerufen wuerde der Test nichts ueber
    // Parallelitaet aussagen.
    const [first, second] = await Promise.all([
      inTransaction((client) =>
        createUserWithAnomailId(client, "parallel-a@example.test", null),
      ),
      inTransaction((client) =>
        createUserWithAnomailId(client, "parallel-b@example.test", null),
      ),
    ]);

    expect(first.anomailId).not.toBe(second.anomailId);
    expect(first.anomailId).toMatch(ANOMAIL_ID_PATTERN);
    expect(second.anomailId).toMatch(ANOMAIL_ID_PATTERN);
  });

  test("eine erzwungene Kollision fuehrt zu einer neuen ID, nicht zum Abbruch", async () => {
    const belegt = "AN-KKKK-7777";

    await inTransaction(async (client) => {
      const first = await createUserWithAnomailId(
        client,
        "belegt@example.test",
        null,
        () => belegt,
      );
      expect(first.anomailId).toBe(belegt);
    });

    // Der Erzeuger liefert zuerst genau die schon vergebene Kennung. Der
    // Unique-Constraint muss den Versuch abweisen und einen neuen ausloesen -
    // und zwar innerhalb einer laufenden Transaktion, so wie im Adapter.
    let call = 0;
    const kollidierend = () => {
      call += 1;
      return call === 1 ? belegt : "AN-MMMM-8888";
    };

    await inTransaction(async (client) => {
      const second = await createUserWithAnomailId(
        client,
        "kollision@example.test",
        null,
        kollidierend,
      );

      expect(call).toBe(2);
      expect(second.anomailId).toBe("AN-MMMM-8888");
    });
  });

  test("dauerhafte Kollision endet nach fuenf Versuchen mit einem Fehler", async () => {
    const belegt = "AN-QQQQ-9999";

    await inTransaction(async (client) => {
      await createUserWithAnomailId(
        client,
        "dauerhaft@example.test",
        null,
        () => belegt,
      );
    });

    let versuche = 0;
    const immerGleich = () => {
      versuche += 1;
      return belegt;
    };

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await expect(
        createUserWithAnomailId(client, "abbruch@example.test", null, immerGleich),
      ).rejects.toBeInstanceOf(AnomailIdAssignmentError);

      expect(versuche).toBe(ANOMAIL_ID_MAX_ATTEMPTS);

      // Die Transaktion ist nach fuenf abgefangenen Kollisionen noch brauchbar.
      // Waeren die Savepoints falsch gesetzt, scheiterte schon dieser Befehl.
      const { rows } = await client.query<{ ok: number }>(`SELECT 1 AS ok`);
      expect(rows[0].ok).toBe(1);

      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });
});

describe("6 - Zurueckgezogene Kennungen", () => {
  test("eine zurueckgezogene ID wird nicht erneut vergeben", async () => {
    const zurueckgezogen = "AN-RRRR-2222";
    const ersatz = "AN-SSSS-3333";

    await inTransaction((client) => retireAnomailId(client, zurueckgezogen));

    let call = 0;
    const erstAlteDannNeue = () => {
      call += 1;
      return call === 1 ? zurueckgezogen : ersatz;
    };

    await inTransaction(async (client) => {
      const created = await createUserWithAnomailId(
        client,
        "nach-loeschung@example.test",
        null,
        erstAlteDannNeue,
      );

      expect(created.anomailId).toBe(ersatz);
      expect(created.anomailId).not.toBe(zurueckgezogen);
      expect(call).toBe(2);
    });

    // Die zurueckgezogene Kennung taucht in keiner Nutzerzeile auf.
    const { rows } = await owner.query(
      `SELECT 1 FROM users WHERE anomail_id = $1`,
      [zurueckgezogen],
    );
    expect(rows).toHaveLength(0);
  });

  test("retireAnomailId ist mehrfach aufrufbar", async () => {
    await inTransaction(async (client) => {
      await retireAnomailId(client, "AN-TTTT-4444");
      await retireAnomailId(client, "AN-TTTT-4444");
    });

    const { rows } = await owner.query<{ n: string }>(
      `SELECT count(*) AS n FROM retired_anomail_ids WHERE anomail_id = $1`,
      ["AN-TTTT-4444"],
    );
    expect(Number(rows[0].n)).toBe(1);
  });
});
