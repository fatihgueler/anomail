import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { assertRlsAppliesToConnection } from "@/lib/db/client";

import {
  connectAs,
  createUser,
  startTestDatabase,
  truncateAll,
  type TestDatabase,
} from "./harness";

/**
 * Diese Tests pruefen die Sicherheitsgrenze, nicht das Schema.
 *
 * Entscheidend ist jeweils, dass eine unerlaubte Abfrage NULL Zeilen liefert -
 * nicht gefilterte, nicht leergeraeumte, sondern von der Datenbank verweigerte.
 * Zu jedem Verbot gehoert eine Gegenprobe, die zeigt, dass die Policy nicht
 * einfach alles blockiert.
 */

let database: TestDatabase;
let owner: Client;

beforeAll(async () => {
  database = await startTestDatabase();
  owner = new Client({ connectionString: database.ownerUrl });
  await owner.connect();
});

afterAll(async () => {
  await owner?.end();
  await database?.stop();
});

beforeEach(async () => {
  await truncateAll(owner);
});

async function insertLetter(
  authorId: string,
  options: {
    status?: string;
    minutesAgo?: number;
    responderId?: string | null;
    assignedMinutesAgo?: number | null;
  } = {},
): Promise<string> {
  const {
    status = "waiting",
    minutesAgo = 0,
    responderId = null,
    assignedMinutesAgo = null,
  } = options;

  const { rows } = await owner.query<{ id: string }>(
    `INSERT INTO letters (author_id, content, status, responder_id, assigned_at, created_at)
     VALUES (
       $1,
       'Platzhaltertext für einen Testbrief.',
       $2::letter_status,
       $3,
       CASE WHEN $4::int IS NULL THEN NULL ELSE now() - ($4::int * interval '1 minute') END,
       now() - ($5::int * interval '1 minute')
     )
     RETURNING id`,
    [authorId, status, responderId, assignedMinutesAgo, minutesAgo],
  );

  return rows[0].id;
}

describe("Zugriffsgrenze", () => {
  test("1 - Nutzer A kann Nutzer Bs private Nachricht nicht lesen", async () => {
    const a = await createUser(owner);
    const b = await createUser(owner);
    const c = await createUser(owner);

    const letterId = await insertLetter(b.id, { status: "answered" });

    const { rows: conversationRows } = await owner.query<{ id: string }>(
      `INSERT INTO conversations (original_letter_id, participant_a_id, participant_b_id)
       VALUES ($1, $2, $3) RETURNING id`,
      [letterId, b.id, c.id],
    );
    const conversationId = conversationRows[0].id;

    const { rows: messageRows } = await owner.query<{ id: string }>(
      `INSERT INTO messages (conversation_id, sender_id, content, is_original)
       VALUES ($1, $2, 'Sehr privater Platzhaltertext.', true) RETURNING id`,
      [conversationId, b.id],
    );
    const messageId = messageRows[0].id;

    const asA = await connectAs(database.appUrl, a.id);
    try {
      const direct = await asA.query(
        `SELECT id, content FROM messages WHERE id = $1`,
        [messageId],
      );
      expect(direct.rowCount).toBe(0);

      // Auch die ungefilterte Abfrage liefert nichts, nicht nur die gezielte.
      const everything = await asA.query(`SELECT id FROM messages`);
      expect(everything.rowCount).toBe(0);

      const conversation = await asA.query(
        `SELECT id FROM conversations WHERE id = $1`,
        [conversationId],
      );
      expect(conversation.rowCount).toBe(0);
    } finally {
      await asA.end();
    }

    // Gegenprobe: der Teilnehmer sieht dieselbe Nachricht sehr wohl.
    const asC = await connectAs(database.appUrl, c.id);
    try {
      const visible = await asC.query(`SELECT id FROM messages WHERE id = $1`, [
        messageId,
      ]);
      expect(visible.rowCount).toBe(1);
    } finally {
      await asC.end();
    }
  });

  test("2 - Nutzer A kann Nutzer Bs E-Mail-Adresse nicht lesen", async () => {
    const a = await createUser(owner);
    const b = await createUser(owner);

    const asA = await connectAs(database.appUrl, a.id);
    try {
      const foreign = await asA.query(`SELECT email FROM users WHERE id = $1`, [
        b.id,
      ]);
      expect(foreign.rowCount).toBe(0);

      const listing = await asA.query(`SELECT id, email FROM users`);
      expect(listing.rows.map((row) => row.id)).toEqual([a.id]);

      // Gegenprobe: die eigene Zeile ist vollstaendig lesbar.
      const own = await asA.query(`SELECT email FROM users WHERE id = $1`, [
        a.id,
      ]);
      expect(own.rowCount).toBe(1);
      expect(own.rows[0].email).toBe(a.email);

      // Die Profil-Sicht hat gar keine E-Mail-Spalte.
      const columns = await asA.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'user_profiles'`,
      );
      expect(columns.rows.map((row) => row.column_name)).not.toContain("email");

      // Und sie listet keine fremden Nutzer auf.
      const profiles = await asA.query(`SELECT id FROM user_profiles`);
      expect(profiles.rows.map((row) => row.id)).toEqual([a.id]);
    } finally {
      await asA.end();
    }

    // Gegenprobe: die Moderation darf fremde Zeilen sehen.
    const moderator = await createUser(owner, { role: "moderator" });
    const asModerator = await connectAs(database.appUrl, moderator.id);
    try {
      const foreign = await asModerator.query(
        `SELECT email FROM users WHERE id = $1`,
        [b.id],
      );
      expect(foreign.rowCount).toBe(1);
    } finally {
      await asModerator.end();
    }
  });

  test("3 - zwei parallele assign_letter-Aufrufe bekommen nie denselben Brief", async () => {
    const author = await createUser(owner);
    const first = await createUser(owner);
    const second = await createUser(owner);

    // Mehrere Runden, weil eine einzelne Runde je nach Zeitpunkt auch ohne
    // Sperre zufaellig richtig ausgehen koennte.
    for (let round = 0; round < 5; round += 1) {
      await owner.query(`DELETE FROM letters`);
      const letterId = await insertLetter(author.id, { status: "waiting" });

      const [clientA, clientB] = await Promise.all([
        connectAs(database.appUrl, first.id),
        connectAs(database.appUrl, second.id),
      ]);

      try {
        // Zwei echte, gleichzeitig offene Verbindungen - nacheinander gerufen
        // wuerde der Test die Sperre gar nicht beanspruchen.
        await Promise.all([clientA.query("BEGIN"), clientB.query("BEGIN")]);

        const [resultA, resultB] = await Promise.all([
          clientA.query<{ id: string | null }>(
            `SELECT * FROM assign_letter($1)`,
            [first.id],
          ),
          clientB.query<{ id: string | null }>(
            `SELECT * FROM assign_letter($1)`,
            [second.id],
          ),
        ]);

        await Promise.all([clientA.query("COMMIT"), clientB.query("COMMIT")]);

        const winners = [
          resultA.rows[0]?.id ?? null,
          resultB.rows[0]?.id ?? null,
        ].filter((id): id is string => id !== null);

        expect(winners).toHaveLength(1);
        expect(winners[0]).toBe(letterId);
      } finally {
        await Promise.all([clientA.end(), clientB.end()]);
      }

      const { rows } = await owner.query<{ status: string; responder: string }>(
        `SELECT status, responder_id AS responder FROM letters WHERE id = $1`,
        [letterId],
      );
      expect(rows[0].status).toBe("in_progress");
      expect(rows[0].responder).not.toBeNull();
    }
  });

  test("4 - assign_letter ueberspringt Blockierungen in beiden Richtungen", async () => {
    const responder = await createUser(owner);
    const blocksTheResponder = await createUser(owner);
    const blockedByResponder = await createUser(owner);
    const neutral = await createUser(owner);

    // Reihenfolge so gewaehlt, dass ohne Blockierpruefung der erste Brief
    // gewinnen wuerde: er ist der aelteste.
    const fromBlocker = await insertLetter(blocksTheResponder.id, {
      minutesAgo: 30,
    });
    const fromBlocked = await insertLetter(blockedByResponder.id, {
      minutesAgo: 20,
    });
    const fromNeutral = await insertLetter(neutral.id, { minutesAgo: 10 });

    // Richtung 1: der Autor hat den Responder blockiert.
    await owner.query(
      `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)`,
      [blocksTheResponder.id, responder.id],
    );
    // Richtung 2: der Responder hat den Autor blockiert.
    await owner.query(
      `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)`,
      [responder.id, blockedByResponder.id],
    );

    const asResponder = await connectAs(database.appUrl, responder.id);
    try {
      const assigned = await asResponder.query<{ id: string | null }>(
        `SELECT * FROM assign_letter($1)`,
        [responder.id],
      );
      expect(assigned.rows[0].id).toBe(fromNeutral);

      // Ohne den neutralen Brief bleibt nur noch NULL uebrig.
      const empty = await asResponder.query<{ id: string | null }>(
        `SELECT * FROM assign_letter($1)`,
        [responder.id],
      );
      expect(empty.rows[0].id).toBeNull();
    } finally {
      await asResponder.end();
    }

    // Beide blockierten Briefe stehen unveraendert auf waiting.
    const { rows } = await owner.query<{ id: string; status: string }>(
      `SELECT id, status FROM letters WHERE id = ANY($1::uuid[]) ORDER BY created_at`,
      [[fromBlocker, fromBlocked]],
    );
    expect(rows.map((row) => row.status)).toEqual(["waiting", "waiting"]);
  });

  test("5 - release_expired_leases setzt genau die abgelaufenen Zuweisungen zurueck", async () => {
    const author = await createUser(owner);
    const responder = await createUser(owner);

    const expired = await insertLetter(author.id, {
      status: "in_progress",
      responderId: responder.id,
      assignedMinutesAgo: 30,
      minutesAgo: 60,
    });
    const fresh = await insertLetter(author.id, {
      status: "in_progress",
      responderId: responder.id,
      assignedMinutesAgo: 2,
      minutesAgo: 50,
    });
    const waiting = await insertLetter(author.id, {
      status: "waiting",
      minutesAgo: 40,
    });
    const answered = await insertLetter(author.id, {
      status: "answered",
      responderId: responder.id,
      assignedMinutesAgo: 120,
      minutesAgo: 130,
    });

    const { rows: released } = await owner.query<{ released: number }>(
      `SELECT release_expired_leases() AS released`,
    );
    expect(released[0].released).toBe(1);

    const { rows } = await owner.query<{
      id: string;
      status: string;
      responder_id: string | null;
      assigned_at: Date | null;
    }>(
      `SELECT id, status, responder_id, assigned_at FROM letters WHERE id = ANY($1::uuid[])`,
      [[expired, fresh, waiting, answered]],
    );

    const byId = new Map(rows.map((row) => [row.id, row]));

    // Genau die abgelaufene Zuweisung ist zurueckgesetzt.
    expect(byId.get(expired)?.status).toBe("waiting");
    expect(byId.get(expired)?.responder_id).toBeNull();
    expect(byId.get(expired)?.assigned_at).toBeNull();

    // Die laufende Zuweisung bleibt unangetastet.
    expect(byId.get(fresh)?.status).toBe("in_progress");
    expect(byId.get(fresh)?.responder_id).toBe(responder.id);
    expect(byId.get(fresh)?.assigned_at).not.toBeNull();

    // Und die uebrigen Zustaende ebenfalls.
    expect(byId.get(waiting)?.status).toBe("waiting");
    expect(byId.get(answered)?.status).toBe("answered");
    expect(byId.get(answered)?.responder_id).toBe(responder.id);
  });
});

describe("Verbindungsschutz", () => {
  test("die Anwendung verweigert eine Verbindung, die RLS umgehen wuerde", async () => {
    // Der Eigentuemer umgeht RLS lautlos. Genau das muss auffallen.
    const ownerPool = new (await import("pg")).Pool({
      connectionString: database.ownerUrl,
    });
    const ownerClient = await ownerPool.connect();

    try {
      await expect(
        assertRlsAppliesToConnection(ownerClient),
      ).rejects.toThrow(/Superuser|Eigentuemer/);
    } finally {
      ownerClient.release();
      await ownerPool.end();
    }

    // Die Anwendungsrolle kommt durch.
    const appPool = new (await import("pg")).Pool({
      connectionString: database.appUrl,
    });
    const appClient = await appPool.connect();

    try {
      await expect(
        assertRlsAppliesToConnection(appClient),
      ).resolves.toBeUndefined();
    } finally {
      appClient.release();
      await appPool.end();
    }
  });
});
