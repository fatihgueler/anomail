import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  archiveConversation,
  deleteOwnLetter,
  deleteOwnMessage,
  loadConversation,
  loadMyLetters,
  postMessage,
} from "@/lib/actions/conversation";
import { assignLetterForUser, replyToLetter } from "@/lib/actions/listen";
import { closePools } from "@/lib/db/client";
import { ScriptedSafetyProvider, type ProviderVerdict } from "@/lib/safety";

import {
  createUser,
  startTestDatabase,
  truncateAll,
  type TestDatabase,
} from "../db/harness";

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

const text = (n: number) => "a".repeat(n);
const sessionFor = (id: string) => ({ user: { id, isBanned: false } });

/** Legt Brief, Zuweisung und Antwort an - der Zustand nach AP5. */
async function makeConversation(): Promise<{
  author: Awaited<ReturnType<typeof createUser>>;
  responder: Awaited<ReturnType<typeof createUser>>;
  letterId: string;
  conversationId: string;
}> {
  const author = await createUser(owner);
  const responder = await createUser(owner);

  const { rows } = await owner.query<{ id: string }>(
    `INSERT INTO letters (author_id, content, status)
     VALUES ($1, $2, 'waiting') RETURNING id`,
    [author.id, `Brieftext ${text(200)}`],
  );
  const letterId = rows[0].id;

  await assignLetterForUser(sessionFor(responder.id));
  await replyToLetter(
    sessionFor(responder.id),
    { letterId, content: `Antworttext ${text(200)}` },
    { safetyProvider: green() },
  );

  const conversation = await owner.query<{ id: string }>(
    `SELECT id FROM conversations WHERE original_letter_id = $1`,
    [letterId],
  );

  return { author, responder, letterId, conversationId: conversation.rows[0].id };
}

async function count(table: string): Promise<number> {
  const { rows } = await owner.query<{ n: string }>(
    `SELECT count(*) AS n FROM ${table}`,
  );
  return Number(rows[0].n);
}

describe("1 - Nichtteilnehmer", () => {
  test("bekommt einen erklaerten Zustand und null Nachrichten", async () => {
    const { conversationId } = await makeConversation();
    const fremder = await createUser(owner);

    const result = await loadConversation(sessionFor(fremder.id), conversationId);

    expect(result.status).toBe("not-found");
    if (result.status === "not-found") {
      expect(result.message.length).toBeGreaterThan(20);
    }

    // Gegenprobe auf der Datenbankebene: die Policy gibt ihm auch direkt nichts.
    const bare = new Client({ connectionString: database.appUrl });
    await bare.connect();
    try {
      await bare.query(`SELECT set_config('app.current_user_id', $1, false)`, [
        fremder.id,
      ]);
      const rows = await bare.query(`SELECT id FROM messages`);
      expect(rows.rowCount).toBe(0);
    } finally {
      await bare.end();
    }
  });

  test("ein Teilnehmer sieht den Verlauf sehr wohl", async () => {
    const { author, conversationId } = await makeConversation();

    const result = await loadConversation(sessionFor(author.id), conversationId);

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.messages).toHaveLength(2);
      expect(result.data.messages[0].isOriginal).toBe(true);
      expect(result.data.partnerAnomailId).not.toBeNull();
    }
  });
});

describe("2 - Schreiben in fremden Briefwechsel", () => {
  test("wird auch bei manipulierter conversation_id abgewiesen", async () => {
    const { conversationId } = await makeConversation();
    const fremder = await createUser(owner);

    const before = await count("messages");

    const result = await postMessage(
      sessionFor(fremder.id),
      { conversationId, content: "Ich gehoere hier nicht dazu." },
      { safetyProvider: green() },
    );

    expect(result.status).toBe("not-allowed");
    expect(await count("messages")).toBe(before);
  });

  test("eine erfundene conversation_id erzeugt nichts", async () => {
    const user = await createUser(owner);

    const result = await postMessage(
      sessionFor(user.id),
      {
        conversationId: "7a1c9f4e-0000-4000-8000-000000000000",
        content: "Hallo",
      },
      { safetyProvider: green() },
    );

    expect(result.status).toBe("not-allowed");
    expect(await count("messages")).toBe(0);
  });

  test("ein Teilnehmer kann schreiben", async () => {
    const { author, conversationId } = await makeConversation();

    const result = await postMessage(
      sessionFor(author.id),
      { conversationId, content: "Danke fuer deine Antwort." },
      { safetyProvider: green() },
    );

    expect(result.status).toBe("ok");
    expect(await count("messages")).toBe(3);
  });
});

describe("3 - Fremde Nachricht loeschen", () => {
  test("wird abgewiesen und laesst den Inhalt unangetastet", async () => {
    const { author, responder, conversationId } = await makeConversation();

    const { rows } = await owner.query<{ id: string; content: string }>(
      `SELECT id, content FROM messages WHERE sender_id = $1`,
      [responder.id],
    );
    const fremdeNachricht = rows[0];

    const result = await deleteOwnMessage(
      sessionFor(author.id),
      fremdeNachricht.id,
    );

    expect(result.status).toBe("not-allowed");

    const after = await owner.query<{ content: string; deleted_at: Date | null }>(
      `SELECT content, deleted_at FROM messages WHERE id = $1`,
      [fremdeNachricht.id],
    );
    expect(after.rows[0].content).toBe(fremdeNachricht.content);
    expect(after.rows[0].deleted_at).toBeNull();

    // Gegenprobe: die eigene Nachricht laesst sich loeschen.
    const own = await owner.query<{ id: string }>(
      `SELECT id FROM messages WHERE sender_id = $1`,
      [author.id],
    );
    const ok = await deleteOwnMessage(sessionFor(author.id), own.rows[0].id);
    expect(ok.status).toBe("ok");

    // Und der Briefwechsel bleibt fuer den anderen lesbar.
    const view = await loadConversation(sessionFor(responder.id), conversationId);
    expect(view.status).toBe("ok");
  });
});

describe("4 - Geloeschter Text ist nicht mehr lesbar", () => {
  test("ueber keinen Abfrageweg", async () => {
    const { responder, conversationId } = await makeConversation();

    const { rows } = await owner.query<{ id: string }>(
      `SELECT id FROM messages WHERE sender_id = $1`,
      [responder.id],
    );
    const messageId = rows[0].id;

    await deleteOwnMessage(sessionFor(responder.id), messageId);

    // Direkt in der Tabelle, ohne RLS und ohne Anwendungsschicht.
    const raw = await owner.query<{ content: string; deleted_at: Date | null }>(
      `SELECT content, deleted_at FROM messages WHERE id = $1`,
      [messageId],
    );
    expect(raw.rows[0].content).toBe("");
    expect(raw.rows[0].deleted_at).not.toBeNull();

    // Und ueber die Anwendungsschicht ebenfalls nicht.
    const view = await loadConversation(sessionFor(responder.id), conversationId);
    if (view.status === "ok") {
      const deleted = view.data.messages.find((m) => m.id === messageId);
      expect(deleted?.isDeleted).toBe(true);
      expect(deleted?.content).toBe("");
    }

    // Der Verlauf bricht nicht ab: die Blase bleibt als Platzhalter.
    expect(await count("messages")).toBe(2);
  });
});

describe("5 - Eigenen Brief loeschen", () => {
  test("laesst den Verlauf fuer die andere Person intakt", async () => {
    const { author, responder, letterId, conversationId } =
      await makeConversation();

    const result = await deleteOwnLetter(sessionFor(author.id), letterId);
    expect(result.status).toBe("ok");

    // Der Brief ist geloescht und geleert.
    const letter = await owner.query<{
      deleted_at: Date | null;
      content: string;
    }>(`SELECT deleted_at, content FROM letters WHERE id = $1`, [letterId]);
    expect(letter.rows[0].deleted_at).not.toBeNull();
    expect(letter.rows[0].content).toBe("");

    // Der Briefwechsel besteht weiter.
    const view = await loadConversation(sessionFor(responder.id), conversationId);
    expect(view.status).toBe("ok");

    if (view.status === "ok") {
      expect(view.data.messages).toHaveLength(2);

      // Die Original-Nachricht ist zum Platzhalter geworden.
      const original = view.data.messages.find((m) => m.isOriginal);
      expect(original?.isDeleted).toBe(true);
      expect(original?.content).toBe("");

      // Die Antwort der anderen Person ist unangetastet.
      const reply = view.data.messages.find((m) => !m.isOriginal);
      expect(reply?.isDeleted).toBe(false);
      expect(reply?.content.length).toBeGreaterThan(0);
    }
  });

  test("ein wartender Brief faellt aus der Zuweisung", async () => {
    const author = await createUser(owner);
    const reader = await createUser(owner);

    const { rows } = await owner.query<{ id: string }>(
      `INSERT INTO letters (author_id, content, status)
       VALUES ($1, $2, 'waiting') RETURNING id`,
      [author.id, text(200)],
    );

    await deleteOwnLetter(sessionFor(author.id), rows[0].id);

    const assigned = await assignLetterForUser(sessionFor(reader.id));
    expect(assigned.status).toBe("empty");
  });

  test("ein fremder Brief laesst sich nicht loeschen", async () => {
    const { responder, letterId } = await makeConversation();

    const result = await deleteOwnLetter(sessionFor(responder.id), letterId);
    expect(result.status).toBe("not-allowed");

    const letter = await owner.query<{ deleted_at: Date | null }>(
      `SELECT deleted_at FROM letters WHERE id = $1`,
      [letterId],
    );
    expect(letter.rows[0].deleted_at).toBeNull();
  });
});

describe("6 - Zurueckgehaltene Nachricht", () => {
  test("ist fuer den Empfaenger nicht abrufbar und erzeugt keine Benachrichtigung", async () => {
    const { author, responder, conversationId } = await makeConversation();

    const before = await count("notifications");

    const result = await postMessage(
      sessionFor(author.id),
      { conversationId, content: "Ein Beitrag, der geprueft wird." },
      { safetyProvider: red() },
    );
    expect(result.status).toBe("ok");

    // Keine zusaetzliche Benachrichtigung.
    expect(await count("notifications")).toBe(before);

    // Der Empfaenger sieht sie nicht.
    const recipientView = await loadConversation(
      sessionFor(responder.id),
      conversationId,
    );
    expect(recipientView.status).toBe("ok");
    if (recipientView.status === "ok") {
      expect(recipientView.data.messages).toHaveLength(2);
      expect(recipientView.data.messages.some((m) => m.isHeld)).toBe(false);
    }

    // Der Absender sieht sie mit Hinweis.
    const senderView = await loadConversation(
      sessionFor(author.id),
      conversationId,
    );
    if (senderView.status === "ok") {
      expect(senderView.data.messages).toHaveLength(3);
      const held = senderView.data.messages.find((m) => m.isHeld);
      expect(held).toBeDefined();
    }

    // hidden_at, niemals deleted_at.
    const raw = await owner.query<{
      hidden_at: Date | null;
      deleted_at: Date | null;
    }>(`SELECT hidden_at, deleted_at FROM messages WHERE hidden_at IS NOT NULL`);
    expect(raw.rows).toHaveLength(1);
    expect(raw.rows[0].deleted_at).toBeNull();
  });
});

describe("7 - Archivierter Briefwechsel", () => {
  test("kann nicht beschrieben werden", async () => {
    const { author, responder, conversationId } = await makeConversation();

    const archived = await archiveConversation(
      sessionFor(author.id),
      conversationId,
    );
    expect(archived.status).toBe("ok");

    const before = await count("messages");

    // Beide Seiten sind gesperrt, nicht nur die archivierende.
    for (const user of [author, responder]) {
      const result = await postMessage(
        sessionFor(user.id),
        { conversationId, content: "Noch etwas." },
        { safetyProvider: green() },
      );

      expect(result.status).toBe("archived");
    }

    expect(await count("messages")).toBe(before);

    // Der Verlauf bleibt fuer beide lesbar.
    for (const user of [author, responder]) {
      const view = await loadConversation(sessionFor(user.id), conversationId);
      expect(view.status).toBe("ok");
      if (view.status === "ok") {
        expect(view.data.isArchived).toBe(true);
        expect(view.data.messages).toHaveLength(2);
      }
    }
  });

  test("ein Nichtteilnehmer kann nicht archivieren", async () => {
    const { conversationId } = await makeConversation();
    const fremder = await createUser(owner);

    const result = await archiveConversation(
      sessionFor(fremder.id),
      conversationId,
    );
    expect(result.status).toBe("not-allowed");

    const { rows } = await owner.query<{ status: string }>(
      `SELECT status FROM conversations WHERE id = $1`,
      [conversationId],
    );
    expect(rows[0].status).toBe("active");
  });
});

describe("Uebersicht", () => {
  test("zeigt eine Gespraechskennung nur, wenn es den Briefwechsel gibt", async () => {
    const author = await createUser(owner);

    // Ein wartender Brief ohne Briefwechsel.
    await owner.query(
      `INSERT INTO letters (author_id, content, status) VALUES ($1, $2, 'waiting')`,
      [author.id, text(200)],
    );

    const result = await loadMyLetters(sessionFor(author.id));
    expect(result.status).toBe("ok");

    if (result.status === "ok") {
      expect(result.data.letters).toHaveLength(1);
      // Ohne Briefwechsel darf die Oberflaeche kein "Gespräch öffnen" bauen.
      expect(result.data.letters[0].conversationId).toBeNull();
    }
  });

  test("liefert die Kennung, sobald ein Briefwechsel besteht", async () => {
    const { author, conversationId } = await makeConversation();

    const result = await loadMyLetters(sessionFor(author.id));

    if (result.status === "ok") {
      expect(result.data.letters[0].conversationId).toBe(conversationId);
      expect(result.data.letters[0].status).toBe("answered");
    }
  });

  test("trennt eigene Briefe von eigenen Antworten", async () => {
    const { author, responder } = await makeConversation();

    const authorView = await loadMyLetters(sessionFor(author.id));
    if (authorView.status === "ok") {
      expect(authorView.data.letters).toHaveLength(1);
      expect(authorView.data.replies).toHaveLength(0);
    }

    const responderView = await loadMyLetters(sessionFor(responder.id));
    if (responderView.status === "ok") {
      expect(responderView.data.letters).toHaveLength(0);
      expect(responderView.data.replies).toHaveLength(1);
      expect(responderView.data.replies[0].partnerAnomailId).toBe(
        author.anomailId,
      );
    }
  });
});
