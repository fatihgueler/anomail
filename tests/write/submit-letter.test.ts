import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  ALLOWED_CATEGORY_SLUGS,
  LETTER_MAX_LENGTH,
  LETTER_MIN_LENGTH,
  submitLetter,
} from "@/lib/actions/write-letter";
import { closePools } from "@/lib/db/client";
import { ScriptedSafetyProvider, type ProviderVerdict } from "@/lib/safety";

import {
  createUser,
  startTestDatabase,
  truncateAll,
  type TestDatabase,
} from "../db/harness";

/**
 * Geprueft wird die Grenze, nicht der gute Fall.
 *
 * Jeder Test setzt an einer Stelle an, an der ein Brief entstehen koennte, der
 * nicht entstehen darf - zu kurz, zu lang, mit erfundener Kategorie, ohne
 * Pruefung, von einem gesperrten Konto oder zweimal.
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

  // Die acht Kategorien, wie sie der Seed anlegt.
  for (const slug of ALLOWED_CATEGORY_SLUGS) {
    await owner.query(
      `INSERT INTO categories (slug, label) VALUES ($1, $2)`,
      [slug, slug],
    );
  }
});

const GREEN: ProviderVerdict = {
  riskLevel: "GREEN",
  detectedCategories: [],
  reasoning: "Testfall ohne Signal.",
};

const RED: ProviderVerdict = {
  riskLevel: "RED",
  detectedCategories: ["selbstgefaehrdung"],
  reasoning: "Testfall mit Signal.",
};

function green() {
  return new ScriptedSafetyProvider({ kind: "verdict", verdict: GREEN });
}

function text(length: number): string {
  return "a".repeat(length);
}

function sessionFor(userId: string, banned = false) {
  return { user: { id: userId, isBanned: banned } };
}

async function countLetters(): Promise<number> {
  const { rows } = await owner.query<{ n: string }>(
    `SELECT count(*) AS n FROM letters`,
  );
  return Number(rows[0].n);
}

const uuid = () => crypto.randomUUID();

describe("1 - Laengengrenzen serverseitig", () => {
  test("ein zu kurzer Brief wird abgewiesen, auch ohne Browser-Pruefung", async () => {
    const user = await createUser(owner);

    const result = await submitLetter(
      sessionFor(user.id),
      {
        content: text(LETTER_MIN_LENGTH - 1),
        categorySlugs: ["arbeit"],
        submissionId: uuid(),
      },
      { safetyProvider: green() },
    );

    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.field).toBe("content");
    }
    expect(await countLetters()).toBe(0);
  });

  test("ein zu langer Brief wird abgewiesen", async () => {
    const user = await createUser(owner);

    const result = await submitLetter(
      sessionFor(user.id),
      {
        content: text(LETTER_MAX_LENGTH + 1),
        categorySlugs: [],
        submissionId: uuid(),
      },
      { safetyProvider: green() },
    );

    expect(result.status).toBe("invalid");
    expect(await countLetters()).toBe(0);
  });

  test("die Datenbank haelt die Grenze auch dann, wenn die Aktion sie nicht haelt", async () => {
    const user = await createUser(owner);

    // Direkter Aufruf der Funktion, an der Serveraktion vorbei.
    await owner.query(
      `SELECT set_config('app.current_user_id', $1, false)`,
      [user.id],
    );

    await expect(
      owner.query(
        `SELECT id FROM create_letter($1, '{}'::uuid[], $2::uuid, 'GREEN'::risk_level, false, '{}'::text[], 'test', 'test')`,
        [text(20), uuid()],
      ),
    ).rejects.toThrow();

    expect(await countLetters()).toBe(0);
  });

  test("die Untergrenze laesst einen gueltigen Brief durch", async () => {
    const user = await createUser(owner);

    const result = await submitLetter(
      sessionFor(user.id),
      {
        content: text(LETTER_MIN_LENGTH),
        categorySlugs: ["hoffnung"],
        submissionId: uuid(),
      },
      { safetyProvider: green() },
    );

    expect(result.status).toBe("ok");
    expect(await countLetters()).toBe(1);
  });
});

describe("2 - Kategorien", () => {
  test("eine erfundene Kategorie wird abgewiesen", async () => {
    const user = await createUser(owner);

    const result = await submitLetter(
      sessionFor(user.id),
      {
        content: text(200),
        categorySlugs: ["gibt-es-nicht"],
        submissionId: uuid(),
      },
      { safetyProvider: green() },
    );

    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.field).toBe("categories");
    }
    expect(await countLetters()).toBe(0);
  });

  test("eine erfundene Kategorie-UUID scheitert auch direkt an der Funktion", async () => {
    const user = await createUser(owner);
    await owner.query(`SELECT set_config('app.current_user_id', $1, false)`, [
      user.id,
    ]);

    await expect(
      owner.query(
        `SELECT id FROM create_letter($1, ARRAY['7a1c9f4e-0000-4000-8000-000000000000']::uuid[], $2::uuid, 'GREEN'::risk_level, false, '{}'::text[], 'test', 'test')`,
        [text(200), uuid()],
      ),
    ).rejects.toThrow();

    expect(await countLetters()).toBe(0);
  });

  test("ohne Auswahl wird Sonstiges gesetzt", async () => {
    const user = await createUser(owner);

    const result = await submitLetter(
      sessionFor(user.id),
      { content: text(200), categorySlugs: [], submissionId: uuid() },
      { safetyProvider: green() },
    );

    expect(result.status).toBe("ok");

    const { rows } = await owner.query<{ slug: string }>(
      `SELECT c.slug FROM letter_categories lc
         JOIN categories c ON c.id = lc.category_id`,
    );
    expect(rows.map((row) => row.slug)).toEqual(["sonstiges"]);
  });
});

describe("3 - Ausfall der Pruefung", () => {
  test("ein Zeitueberschreiten laesst keinen Brief durch, sondern haelt zurueck", async () => {
    const user = await createUser(owner);
    const hanging = new ScriptedSafetyProvider({ kind: "hang" });

    const result = await submitLetter(
      sessionFor(user.id),
      { content: text(200), categorySlugs: ["arbeit"], submissionId: uuid() },
      { safetyProvider: hanging, safetyTimeoutMs: 50 },
    );

    expect(result.status).toBe("ok");

    const { rows } = await owner.query<{
      status: string;
      risk_level: string;
      should_hold: boolean;
    }>(
      `SELECT l.status, s.risk_level, s.should_hold
         FROM letters l JOIN safety_checks s ON s.target_id = l.id`,
    );

    // Zurueckgehalten, nicht als wartend in den Pool gegeben.
    expect(rows[0].status).toBe("flagged");
    expect(rows[0].risk_level).toBe("RED");
    expect(rows[0].should_hold).toBe(true);
  });

  test("ein Anbieterfehler fuehrt ebenfalls zum Zurueckhalten", async () => {
    const user = await createUser(owner);
    const broken = new ScriptedSafetyProvider({
      kind: "throw",
      message: "Dienst nicht erreichbar",
    });

    await submitLetter(
      sessionFor(user.id),
      { content: text(200), categorySlugs: [], submissionId: uuid() },
      { safetyProvider: broken },
    );

    const { rows } = await owner.query<{ status: string }>(
      `SELECT status FROM letters`,
    );
    expect(rows[0].status).toBe("flagged");
  });
});

describe("4 - Zurueckgehaltener Brief", () => {
  test("RED mit shouldHold wird flagged und ist ueber die Zuweisung nicht erreichbar", async () => {
    const author = await createUser(owner);
    const responder = await createUser(owner);

    await submitLetter(
      sessionFor(author.id),
      { content: text(200), categorySlugs: ["familie"], submissionId: uuid() },
      {
        safetyProvider: new ScriptedSafetyProvider({
          kind: "verdict",
          verdict: RED,
        }),
      },
    );

    const { rows } = await owner.query<{
      status: string;
      hidden_at: Date | null;
    }>(`SELECT status, hidden_at FROM letters`);

    expect(rows[0].status).toBe("flagged");
    expect(rows[0].hidden_at).not.toBeNull();

    // Die Zuweisung aus AP2 darf ihn nicht herausgeben.
    await owner.query(`SELECT set_config('app.current_user_id', $1, false)`, [
      responder.id,
    ]);
    const assigned = await owner.query<{ id: string | null }>(
      `SELECT * FROM assign_letter($1)`,
      [responder.id],
    );

    expect(assigned.rows[0].id).toBeNull();
  });

  test("CRISIS wird zurueckgehalten, auch wenn der Aufrufer das nicht meldet", async () => {
    const user = await createUser(owner);
    await owner.query(`SELECT set_config('app.current_user_id', $1, false)`, [
      user.id,
    ]);

    // should_hold ausdruecklich false - die Funktion muss trotzdem halten.
    await owner.query(
      `SELECT id FROM create_letter($1, '{}'::uuid[], $2::uuid, 'CRISIS'::risk_level, false, '{}'::text[], 'test', 'test')`,
      [text(200), uuid()],
    );

    const { rows } = await owner.query<{ status: string }>(
      `SELECT status FROM letters`,
    );
    expect(rows[0].status).toBe("flagged");
  });
});

describe("5 - Brief und Pruefprotokoll haengen zusammen", () => {
  test("jeder angelegte Brief hat eine verknuepfte safety_checks-Zeile", async () => {
    const user = await createUser(owner);

    await submitLetter(
      sessionFor(user.id),
      { content: text(200), categorySlugs: ["schule"], submissionId: uuid() },
      { safetyProvider: green() },
    );

    const { rows } = await owner.query<{ n: string }>(
      `SELECT count(*) AS n
         FROM letters l
    LEFT JOIN safety_checks s ON s.target_id = l.id
        WHERE s.id IS NULL`,
    );
    expect(Number(rows[0].n)).toBe(0);
  });

  test("scheitert das Pruefprotokoll, entsteht auch kein Brief", async () => {
    const user = await createUser(owner);

    // Fehler gezielt einbauen: jeder Schreibversuch auf safety_checks bricht ab.
    await owner.query(`
      CREATE FUNCTION test_block_safety_checks() RETURNS trigger
        LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'Testfehler beim Schreiben des Pruefprotokolls';
      END;
      $$;
    `);
    await owner.query(`
      CREATE TRIGGER test_block_safety_checks
        BEFORE INSERT ON safety_checks
        FOR EACH ROW EXECUTE FUNCTION test_block_safety_checks();
    `);

    try {
      const result = await submitLetter(
        sessionFor(user.id),
        { content: text(200), categorySlugs: [], submissionId: uuid() },
        { safetyProvider: green() },
      );

      expect(result.status).toBe("failed");

      // Entscheidend: kein Brief ohne Pruefprotokoll zurueckgeblieben.
      expect(await countLetters()).toBe(0);
    } finally {
      await owner.query(
        `DROP TRIGGER IF EXISTS test_block_safety_checks ON safety_checks`,
      );
      await owner.query(`DROP FUNCTION IF EXISTS test_block_safety_checks()`);
    }
  });
});

describe("6 - Doppeltes Absenden", () => {
  test("dieselbe Absendekennung erzeugt nur einen Brief", async () => {
    const user = await createUser(owner);
    const submissionId = uuid();
    const input = {
      content: text(200),
      categorySlugs: ["einsamkeit"],
      submissionId,
    };

    const first = await submitLetter(sessionFor(user.id), input, {
      safetyProvider: green(),
    });
    const second = await submitLetter(sessionFor(user.id), input, {
      safetyProvider: green(),
    });

    expect(first.status).toBe("ok");
    expect(second.status).toBe("ok");

    if (first.status === "ok" && second.status === "ok") {
      expect(second.letterId).toBe(first.letterId);
      expect(first.duplicate).toBe(false);
      expect(second.duplicate).toBe(true);
    }

    expect(await countLetters()).toBe(1);

    // Und auch kein zweites Pruefprotokoll.
    const { rows } = await owner.query<{ n: string }>(
      `SELECT count(*) AS n FROM safety_checks`,
    );
    expect(Number(rows[0].n)).toBe(1);
  });

  test("zwei gleichzeitige Absenden derselben Kennung erzeugen einen Brief", async () => {
    const user = await createUser(owner);
    const submissionId = uuid();
    const input = {
      content: text(200),
      categorySlugs: [],
      submissionId,
    };

    await Promise.all([
      submitLetter(sessionFor(user.id), input, { safetyProvider: green() }),
      submitLetter(sessionFor(user.id), input, { safetyProvider: green() }),
    ]);

    expect(await countLetters()).toBe(1);
  });
});

describe("7 - Gesperrtes Konto", () => {
  test("die Aktion weist ein gesperrtes Konto ab", async () => {
    const user = await createUser(owner);
    await owner.query(`UPDATE users SET banned_at = now() WHERE id = $1`, [
      user.id,
    ]);

    const result = await submitLetter(
      sessionFor(user.id, true),
      { content: text(200), categorySlugs: [], submissionId: uuid() },
      { safetyProvider: green() },
    );

    expect(result.status).toBe("failed");
    expect(await countLetters()).toBe(0);
  });

  test("auch mit veralteter Sitzung kommt kein Brief durch", async () => {
    const user = await createUser(owner);
    await owner.query(`UPDATE users SET banned_at = now() WHERE id = $1`, [
      user.id,
    ]);

    // Die Sitzung weiss noch nichts von der Sperre. Die Datenbankfunktion
    // prueft deshalb ein zweites Mal.
    const result = await submitLetter(
      sessionFor(user.id, false),
      { content: text(200), categorySlugs: [], submissionId: uuid() },
      { safetyProvider: green() },
    );

    expect(result.status).toBe("failed");
    expect(await countLetters()).toBe(0);
  });
});
