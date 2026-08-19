import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  assignLetterForUser,
  releaseAssignment,
  replyToLetter,
} from "@/lib/actions/listen";
import { closePools } from "@/lib/db/client";
import { ScriptedSafetyProvider, type ProviderVerdict } from "@/lib/safety";

import {
  createUser,
  startTestDatabase,
  truncateAll,
  type TestDatabase,
} from "../db/harness";

/**
 * Geprueft wird die Grenze: dass kein Brief doppelt vergeben wird, dass eine
 * Antwort ohne gueltige Zuweisung nicht durchkommt und dass ein
 * zurueckgehaltener Beitrag keine Benachrichtigung ausloest.
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

const green = () => new ScriptedSafetyProvider({ kind: "verdict", verdict: GREEN });
const red = () => new ScriptedSafetyProvider({ kind: "verdict", verdict: RED });

const text = (length: number) => "a".repeat(length);
const sessionFor = (id: string, banned = false) => ({
  user: { id, isBanned: banned },
});

async function insertLetter(
  authorId: string,
  options: { minutesAgo?: number } = {},
): Promise<string> {
  const { rows } = await owner.query<{ id: string }>(
    `INSERT INTO letters (author_id, content, status, created_at)
     VALUES ($1, $2, 'waiting', now() - ($3::int * interval '1 minute'))
     RETURNING id`,
    [authorId, text(300), options.minutesAgo ?? 0],
  );

  return rows[0].id;
}

async function count(table: string): Promise<number> {
  const { rows } = await owner.query<{ n: string }>(
    `SELECT count(*) AS n FROM ${table}`,
  );
  return Number(rows[0].n);
}

describe("1 - Parallele Zuweisung", () => {
  test("zwei gleichzeitige Aufrufe teilen sich nie denselben Brief", async () => {
    const author = await createUser(owner);
    const first = await createUser(owner);
    const second = await createUser(owner);

    for (let round = 0; round < 5; round += 1) {
      await owner.query(`DELETE FROM letters`);
      const letterId = await insertLetter(author.id);

      // Echte parallele Verbindungen: withUser holt sich je einen eigenen
      // Client aus dem Pool. Nacheinander gerufen bewiese der Test nichts.
      const [a, b] = await Promise.all([
        assignLetterForUser(sessionFor(first.id)),
        assignLetterForUser(sessionFor(second.id)),
      ]);

      const assigned = [a, b].filter((result) => result.status === "assigned");
      const empty = [a, b].filter((result) => result.status === "empty");

      expect(assigned).toHaveLength(1);
      expect(empty).toHaveLength(1);

      if (assigned[0].status === "assigned") {
        expect(assigned[0].letter.id).toBe(letterId);
        expect(assigned[0].letter.authorAnomailId).toBe(author.anomailId);
      }
    }
  });

  test("ein erneuter Aufruf gibt denselben Brief zurueck, statt einen zweiten zu belegen", async () => {
    const author = await createUser(owner);
    const reader = await createUser(owner);

    await insertLetter(author.id, { minutesAgo: 30 });
    await insertLetter(author.id, { minutesAgo: 20 });

    const first = await assignLetterForUser(sessionFor(reader.id));
    const second = await assignLetterForUser(sessionFor(reader.id));

    expect(first.status).toBe("assigned");
    expect(second.status).toBe("assigned");

    if (first.status === "assigned" && second.status === "assigned") {
      expect(second.letter.id).toBe(first.letter.id);
    }

    const { rows } = await owner.query<{ n: string }>(
      `SELECT count(*) AS n FROM letters WHERE status = 'in_progress'`,
    );
    expect(Number(rows[0].n)).toBe(1);
  });
});

describe("2 - Antwort ohne Zuweisung", () => {
  test("eine manipulierte letter_id wird abgewiesen", async () => {
    const author = await createUser(owner);
    const reader = await createUser(owner);
    const fremder = await createUser(owner);

    const letterId = await insertLetter(author.id);
    await assignLetterForUser(sessionFor(reader.id));

    // Der Fremde kennt die ID, hat aber keine Zuweisung.
    const result = await replyToLetter(
      sessionFor(fremder.id),
      { letterId, content: text(200) },
      { safetyProvider: green() },
    );

    expect(result.status).toBe("not-assigned");
    expect(await count("messages")).toBe(0);
    expect(await count("conversations")).toBe(0);
  });

  test("eine erfundene letter_id erzeugt nichts", async () => {
    const reader = await createUser(owner);

    const result = await replyToLetter(
      sessionFor(reader.id),
      {
        letterId: "7a1c9f4e-0000-4000-8000-000000000000",
        content: text(200),
      },
      { safetyProvider: green() },
    );

    expect(result.status).toBe("not-assigned");
    expect(await count("messages")).toBe(0);
  });
});

describe("3 - Abgelaufene Zuweisung", () => {
  test("nach Ablauf und Neuvergabe wird die Antwort abgewiesen", async () => {
    const author = await createUser(owner);
    const firstReader = await createUser(owner);
    const secondReader = await createUser(owner);

    const letterId = await insertLetter(author.id);

    const assigned = await assignLetterForUser(sessionFor(firstReader.id));
    expect(assigned.status).toBe("assigned");

    // Lease kuenstlich altern lassen und den Cron-Schritt ausfuehren.
    await owner.query(
      `UPDATE letters SET assigned_at = now() - interval '11 minutes' WHERE id = $1`,
      [letterId],
    );
    const { rows } = await owner.query<{ released: number }>(
      `SELECT release_expired_leases() AS released`,
    );
    expect(rows[0].released).toBe(1);

    // Jetzt bekommt jemand anderes denselben Brief.
    const reassigned = await assignLetterForUser(sessionFor(secondReader.id));
    expect(reassigned.status).toBe("assigned");

    // Die alte Zuweisung darf nicht mehr schreiben duerfen.
    const late = await replyToLetter(
      sessionFor(firstReader.id),
      { letterId, content: text(200) },
      { safetyProvider: green() },
    );

    expect(late.status).toBe("not-assigned");
    expect(await count("messages")).toBe(0);

    // Der neue Leser kann sehr wohl antworten - genau eine Nachricht mehr.
    const ok = await replyToLetter(
      sessionFor(secondReader.id),
      { letterId, content: text(200) },
      { safetyProvider: green() },
    );

    expect(ok.status).toBe("ok");
    expect(await count("messages")).toBe(2);
  });

  test("eine abgelaufene, aber nicht neu vergebene Zuweisung wird ebenfalls abgewiesen", async () => {
    const author = await createUser(owner);
    const reader = await createUser(owner);

    const letterId = await insertLetter(author.id);
    await assignLetterForUser(sessionFor(reader.id));

    await owner.query(
      `UPDATE letters SET assigned_at = now() - interval '11 minutes' WHERE id = $1`,
      [letterId],
    );

    const result = await replyToLetter(
      sessionFor(reader.id),
      { letterId, content: text(200) },
      { safetyProvider: green() },
    );

    expect(result.status).toBe("not-assigned");
    expect(await count("messages")).toBe(0);
  });
});

describe("4 - Eigener Brief", () => {
  test("der eigene Brief wird nie zugewiesen", async () => {
    const user = await createUser(owner);
    await insertLetter(user.id);

    const result = await assignLetterForUser(sessionFor(user.id));

    expect(result.status).toBe("empty");
  });

  test("bei eigenem und fremdem Brief kommt nur der fremde", async () => {
    const user = await createUser(owner);
    const other = await createUser(owner);

    await insertLetter(user.id, { minutesAgo: 60 });
    const fremd = await insertLetter(other.id, { minutesAgo: 10 });

    const result = await assignLetterForUser(sessionFor(user.id));

    expect(result.status).toBe("assigned");
    if (result.status === "assigned") {
      expect(result.letter.id).toBe(fremd);
    }
  });
});

describe("5 - Blockierungen", () => {
  test("Briefe blockierter Personen werden in beide Richtungen uebersprungen", async () => {
    const reader = await createUser(owner);
    const blocksReader = await createUser(owner);
    const blockedByReader = await createUser(owner);
    const neutral = await createUser(owner);

    // Reihenfolge so, dass ohne Blockpruefung der erste gewinnen wuerde.
    await insertLetter(blocksReader.id, { minutesAgo: 30 });
    await insertLetter(blockedByReader.id, { minutesAgo: 20 });
    const neutralLetter = await insertLetter(neutral.id, { minutesAgo: 10 });

    await owner.query(
      `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)`,
      [blocksReader.id, reader.id],
    );
    await owner.query(
      `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)`,
      [reader.id, blockedByReader.id],
    );

    const result = await assignLetterForUser(sessionFor(reader.id));

    expect(result.status).toBe("assigned");
    if (result.status === "assigned") {
      expect(result.letter.id).toBe(neutralLetter);
    }
  });

  test("bleiben nur blockierte Briefe uebrig, kommt der Leerzustand", async () => {
    const reader = await createUser(owner);
    const blocker = await createUser(owner);

    await insertLetter(blocker.id);
    await owner.query(
      `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)`,
      [blocker.id, reader.id],
    );

    const result = await assignLetterForUser(sessionFor(reader.id));
    expect(result.status).toBe("empty");
  });
});

describe("6 - Zurueckgehaltene Antwort", () => {
  test("setzt hidden_at, nicht deleted_at, und erzeugt keine Benachrichtigung", async () => {
    const author = await createUser(owner);
    const reader = await createUser(owner);

    const letterId = await insertLetter(author.id);
    await assignLetterForUser(sessionFor(reader.id));

    const result = await replyToLetter(
      sessionFor(reader.id),
      { letterId, content: text(200) },
      { safetyProvider: red() },
    );

    expect(result.status).toBe("ok");

    const { rows } = await owner.query<{
      hidden_at: Date | null;
      hidden_reason: string | null;
      deleted_at: Date | null;
    }>(
      `SELECT hidden_at, hidden_reason, deleted_at
         FROM messages WHERE is_original = false`,
    );

    expect(rows[0].hidden_at).not.toBeNull();
    expect(rows[0].hidden_reason).not.toBeNull();
    // Eine Moderationssperre ist keine Nutzerloeschung.
    expect(rows[0].deleted_at).toBeNull();

    // Eine Benachrichtigung wuerde auf eine unsichtbare Nachricht zeigen.
    expect(await count("notifications")).toBe(0);
  });

  test("eine unauffaellige Antwort erzeugt genau eine Benachrichtigung", async () => {
    const author = await createUser(owner);
    const reader = await createUser(owner);

    const letterId = await insertLetter(author.id);
    await assignLetterForUser(sessionFor(reader.id));

    await replyToLetter(
      sessionFor(reader.id),
      { letterId, content: text(200) },
      { safetyProvider: green() },
    );

    const { rows } = await owner.query<{ recipient_id: string; type: string }>(
      `SELECT recipient_id, type FROM notifications`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].recipient_id).toBe(author.id);
    expect(rows[0].type).toBe("new_response");

    // Und der Brief gilt als beantwortet.
    const letter = await owner.query<{ status: string; answered_at: Date | null }>(
      `SELECT status, answered_at FROM letters WHERE id = $1`,
      [letterId],
    );
    expect(letter.rows[0].status).toBe("answered");
    expect(letter.rows[0].answered_at).not.toBeNull();
  });
});

describe("7 - Briefwechsel und Original-Nachricht", () => {
  test("die Original-Nachricht traegt den Brieftext und den Autor als Absender", async () => {
    const author = await createUser(owner);
    const reader = await createUser(owner);

    const letterId = await insertLetter(author.id);
    await assignLetterForUser(sessionFor(reader.id));
    await replyToLetter(
      sessionFor(reader.id),
      { letterId, content: text(200) },
      { safetyProvider: green() },
    );

    const { rows } = await owner.query<{
      sender_id: string;
      is_original: boolean;
      content: string;
    }>(`SELECT sender_id, is_original, content FROM messages ORDER BY created_at`);

    expect(rows).toHaveLength(2);
    expect(rows[0].is_original).toBe(true);
    expect(rows[0].sender_id).toBe(author.id);
    expect(rows[1].is_original).toBe(false);
    expect(rows[1].sender_id).toBe(reader.id);

    const conversation = await owner.query<{
      participant_a_id: string;
      participant_b_id: string;
    }>(`SELECT participant_a_id, participant_b_id FROM conversations`);

    expect(conversation.rows[0].participant_a_id).toBe(author.id);
    expect(conversation.rows[0].participant_b_id).toBe(reader.id);
  });

  test("scheitert ein spaeterer Schritt, entsteht auch kein Briefwechsel", async () => {
    const author = await createUser(owner);
    const reader = await createUser(owner);

    const letterId = await insertLetter(author.id);
    await assignLetterForUser(sessionFor(reader.id));

    // Fehler gezielt einbauen: das Pruefprotokoll ist Schritt 9, also nach
    // Briefwechsel und Original-Nachricht.
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
      const result = await replyToLetter(
        sessionFor(reader.id),
        { letterId, content: text(200) },
        { safetyProvider: green() },
      );

      expect(result.status).toBe("failed");

      // Nichts halb Angelegtes zurueckgeblieben.
      expect(await count("conversations")).toBe(0);
      expect(await count("messages")).toBe(0);
      expect(await count("notifications")).toBe(0);

      // Und der Brief steht weiter auf in_progress, nicht auf answered.
      const letter = await owner.query<{ status: string }>(
        `SELECT status FROM letters WHERE id = $1`,
        [letterId],
      );
      expect(letter.rows[0].status).toBe("in_progress");
    } finally {
      await owner.query(
        `DROP TRIGGER IF EXISTS test_block_safety_checks ON safety_checks`,
      );
      await owner.query(`DROP FUNCTION IF EXISTS test_block_safety_checks()`);
    }
  });
});

describe("Freigabe der Zuweisung", () => {
  test("gibt den Brief sofort zurueck in den Wartezustand", async () => {
    const author = await createUser(owner);
    const reader = await createUser(owner);

    const letterId = await insertLetter(author.id);
    await assignLetterForUser(sessionFor(reader.id));

    const released = await releaseAssignment(sessionFor(reader.id), letterId);
    expect(released.status).toBe("released");

    const { rows } = await owner.query<{
      status: string;
      responder_id: string | null;
      assigned_at: Date | null;
    }>(`SELECT status, responder_id, assigned_at FROM letters WHERE id = $1`, [
      letterId,
    ]);

    expect(rows[0].status).toBe("waiting");
    expect(rows[0].responder_id).toBeNull();
    expect(rows[0].assigned_at).toBeNull();
  });

  test("ein fremder Brief laesst sich nicht freigeben", async () => {
    const author = await createUser(owner);
    const reader = await createUser(owner);
    const fremder = await createUser(owner);

    const letterId = await insertLetter(author.id);
    await assignLetterForUser(sessionFor(reader.id));

    const result = await releaseAssignment(sessionFor(fremder.id), letterId);
    expect(result.status).toBe("nothing");

    const { rows } = await owner.query<{ responder_id: string | null }>(
      `SELECT responder_id FROM letters WHERE id = $1`,
      [letterId],
    );
    expect(rows[0].responder_id).toBe(reader.id);
  });
});
