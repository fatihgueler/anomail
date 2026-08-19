import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { blockUser, loadBlockedPeople, unblockUser } from "@/lib/actions/block";
import { loadConversation, postMessage } from "@/lib/actions/conversation";
import { assignLetterForUser, replyToLetter } from "@/lib/actions/listen";
import {
  countUnreadNotifications,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  setNotificationPreference,
} from "@/lib/actions/notifications";
import { createReport, loadMyReports } from "@/lib/actions/report";
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

async function makeConversation() {
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

describe("1 - Melden fremder Inhalte", () => {
  test("ein Report auf einen fremden Briefwechsel wird abgewiesen", async () => {
    const { conversationId } = await makeConversation();
    const fremder = await createUser(owner);

    const result = await createReport(sessionFor(fremder.id), {
      targetType: "conversation",
      targetId: conversationId,
      reason: "spam",
    });

    expect(result.status).toBe("not-allowed");
    expect(await count("reports")).toBe(0);
  });

  test("eine fremde Nachricht in fremdem Briefwechsel ist nicht meldbar", async () => {
    const { responder } = await makeConversation();
    const fremder = await createUser(owner);

    const { rows } = await owner.query<{ id: string }>(
      `SELECT id FROM messages WHERE sender_id = $1`,
      [responder.id],
    );

    const result = await createReport(sessionFor(fremder.id), {
      targetType: "message",
      targetId: rows[0].id,
      reason: "beleidigung",
    });

    expect(result.status).toBe("not-allowed");
    expect(await count("reports")).toBe(0);
  });

  test("ein Teilnehmer darf die Nachricht des Gegenuebers melden", async () => {
    const { author, responder, conversationId } = await makeConversation();

    const { rows } = await owner.query<{ id: string }>(
      `SELECT id FROM messages WHERE sender_id = $1`,
      [responder.id],
    );

    const result = await createReport(sessionFor(author.id), {
      targetType: "message",
      targetId: rows[0].id,
      reason: "beleidigung",
      note: "Testbeschreibung",
    });

    expect(result.status).toBe("created");
    expect(await count("reports")).toBe(1);

    const stored = await owner.query<{
      reporter_id: string;
      conversation_id: string | null;
      status: string;
    }>(`SELECT reporter_id, conversation_id, status FROM reports`);

    // reporter_id kommt aus der Session, nicht aus der Eingabe.
    expect(stored.rows[0].reporter_id).toBe(author.id);
    expect(stored.rows[0].conversation_id).toBe(conversationId);
    expect(stored.rows[0].status).toBe("pending");
  });
});

describe("2 - Eigene Inhalte sind nicht meldbar", () => {
  test("der eigene Brief nicht", async () => {
    const { author, letterId } = await makeConversation();

    const result = await createReport(sessionFor(author.id), {
      targetType: "letter",
      targetId: letterId,
      reason: "spam",
    });

    expect(result.status).toBe("not-allowed");
    expect(await count("reports")).toBe(0);
  });

  test("die eigene Nachricht nicht", async () => {
    const { responder } = await makeConversation();

    const { rows } = await owner.query<{ id: string }>(
      `SELECT id FROM messages WHERE sender_id = $1`,
      [responder.id],
    );

    const result = await createReport(sessionFor(responder.id), {
      targetType: "message",
      targetId: rows[0].id,
      reason: "spam",
    });

    expect(result.status).toBe("not-allowed");
    expect(await count("reports")).toBe(0);
  });

  test("ein fremder Brief ist meldbar", async () => {
    const { responder, letterId } = await makeConversation();

    const result = await createReport(sessionFor(responder.id), {
      targetType: "letter",
      targetId: letterId,
      reason: "gefaehrliche_inhalte",
    });

    expect(result.status).toBe("created");
  });
});

describe("3 - Doppelmeldung", () => {
  test("erzeugt keinen zweiten Datensatz", async () => {
    const { author, responder, letterId } = await makeConversation();

    const first = await createReport(sessionFor(responder.id), {
      targetType: "letter",
      targetId: letterId,
      reason: "spam",
    });
    const second = await createReport(sessionFor(responder.id), {
      targetType: "letter",
      targetId: letterId,
      reason: "bedrohung",
    });

    expect(first.status).toBe("created");
    expect(second.status).toBe("duplicate");
    expect(await count("reports")).toBe(1);

    // Eine andere Person darf denselben Inhalt sehr wohl melden.
    const { rows } = await owner.query<{ id: string }>(
      `SELECT id FROM messages WHERE sender_id = $1`,
      [responder.id],
    );
    const other = await createReport(sessionFor(author.id), {
      targetType: "message",
      targetId: rows[0].id,
      reason: "spam",
    });
    expect(other.status).toBe("created");
    expect(await count("reports")).toBe(2);
  });

  test("der Melder sieht seine Meldungen mit Status", async () => {
    const { responder, letterId } = await makeConversation();

    await createReport(sessionFor(responder.id), {
      targetType: "letter",
      targetId: letterId,
      reason: "spam",
    });

    const view = await loadMyReports(sessionFor(responder.id));
    expect(view.status).toBe("ok");

    if (view.status === "ok") {
      expect(view.reports).toHaveLength(1);
      expect(view.reports[0].status).toBe("pending");
      expect(view.reports[0].reasonLabel).toBe("Spam");
      expect(view.reports[0].resolutionNote).toBeNull();
    }

    // Eine fremde Meldung taucht bei niemand anderem auf.
    const fremder = await createUser(owner);
    const foreign = await loadMyReports(sessionFor(fremder.id));
    if (foreign.status === "ok") {
      expect(foreign.reports).toHaveLength(0);
    }
  });
});

describe("4 - Blockierung wirkt in beide Richtungen", () => {
  test("nach der Blockierung schlaegt das Senden auf beiden Seiten fehl", async () => {
    const { author, responder, conversationId } = await makeConversation();

    const blocked = await blockUser(sessionFor(author.id), responder.id);
    expect(blocked.status).toBe("ok");

    const before = await count("messages");

    for (const user of [author, responder]) {
      const result = await postMessage(
        sessionFor(user.id),
        { conversationId, content: "Noch etwas." },
        { safetyProvider: green() },
      );

      expect(result.status).toBe("archived");
    }

    expect(await count("messages")).toBe(before);
  });

  test("die Zuweisung ueberspringt blockierte Personen weiterhin", async () => {
    const { author, responder } = await makeConversation();
    await blockUser(sessionFor(author.id), responder.id);

    await owner.query(
      `INSERT INTO letters (author_id, content, status) VALUES ($1, $2, 'waiting')`,
      [responder.id, text(200)],
    );

    const assigned = await assignLetterForUser(sessionFor(author.id));
    expect(assigned.status).toBe("empty");
  });

  test("nach dem Aufheben ist das Schreiben wieder moeglich", async () => {
    const { author, responder, conversationId } = await makeConversation();

    await blockUser(sessionFor(author.id), responder.id);
    await unblockUser(sessionFor(author.id), responder.id);

    const result = await postMessage(
      sessionFor(responder.id),
      { conversationId, content: "Wieder moeglich." },
      { safetyProvider: green() },
    );

    expect(result.status).toBe("ok");
  });

  test("Selbstblockierung ist nicht moeglich", async () => {
    const { author } = await makeConversation();

    const result = await blockUser(sessionFor(author.id), author.id);

    expect(result.status).toBe("not-allowed");
    expect(await count("blocks")).toBe(0);
  });

  test("eine fremde Person ohne gemeinsamen Briefwechsel ist nicht blockierbar", async () => {
    const { author } = await makeConversation();
    const fremder = await createUser(owner);

    const result = await blockUser(sessionFor(author.id), fremder.id);

    expect(result.status).toBe("not-allowed");
    expect(await count("blocks")).toBe(0);
  });
});

describe("5 - Die Blockierung bleibt fuer die betroffene Person verborgen", () => {
  test("gleiche Fehlermeldung und kein Hinweis im Gespraechszustand", async () => {
    const { author, responder, conversationId } = await makeConversation();
    await blockUser(sessionFor(author.id), responder.id);

    const blockerAttempt = await postMessage(
      sessionFor(author.id),
      { conversationId, content: "Test." },
      { safetyProvider: green() },
    );
    const blockedAttempt = await postMessage(
      sessionFor(responder.id),
      { conversationId, content: "Test." },
      { safetyProvider: green() },
    );

    // Wortgleich - sonst liesse sich die Blockierung daran ablesen.
    expect(blockerAttempt.status).toBe("archived");
    expect(blockedAttempt.status).toBe(blockerAttempt.status);

    const messageOf = (result: typeof blockerAttempt) =>
      "message" in result ? result.message : null;

    expect(messageOf(blockedAttempt)).toBe(messageOf(blockerAttempt));
    expect(messageOf(blockedAttempt)).not.toBeNull();

    const blockedView = await loadConversation(
      sessionFor(responder.id),
      conversationId,
    );
    if (blockedView.status === "ok") {
      expect(blockedView.data.canWrite).toBe(false);
      // Neutral: derselbe Grund wie bei jedem geschlossenen Briefwechsel.
      expect(blockedView.data.closedReason).toBe("closed");
    }

    // Nur die blockierende Seite erfaehrt, dass sie blockiert hat.
    const blockerView = await loadConversation(
      sessionFor(author.id),
      conversationId,
    );
    if (blockerView.status === "ok") {
      expect(blockerView.data.closedReason).toBe("blocked-by-you");
    }

    // Und es entsteht keine Benachrichtigung ueber die Blockierung.
    expect(await count("notifications")).toBe(1);

    // Die blockierte Person sieht die Blockierung auch nicht in ihrer Liste.
    const list = await loadBlockedPeople(sessionFor(responder.id));
    if (list.status === "ok") {
      expect(list.people).toHaveLength(0);
    }
  });
});

describe("6 - Zurueckgehaltene Antwort", () => {
  test("erzeugt keine Benachrichtigung", async () => {
    const { author, responder, conversationId } = await makeConversation();
    const before = await count("notifications");

    const result = await postMessage(
      sessionFor(author.id),
      { conversationId, content: "Ein Beitrag, der geprueft wird." },
      { safetyProvider: red() },
    );

    expect(result.status).toBe("ok");
    expect(await count("notifications")).toBe(before);

    // Gegenprobe: eine unauffaellige Nachricht erzeugt eine.
    await postMessage(
      sessionFor(author.id),
      { conversationId, content: "Ein unauffaelliger Beitrag." },
      { safetyProvider: green() },
    );
    expect(await count("notifications")).toBe(before + 1);

    const notified = await loadNotifications(sessionFor(responder.id));
    if (notified.status === "ok") {
      expect(notified.entries.length).toBeGreaterThan(0);
    }
  });

  test("bei ausgeschalteter Praeferenz entsteht keine Benachrichtigung", async () => {
    const { author, responder, conversationId } = await makeConversation();

    await setNotificationPreference(sessionFor(responder.id), false);
    const before = await count("notifications");

    await postMessage(
      sessionFor(author.id),
      { conversationId, content: "Ein unauffaelliger Beitrag." },
      { safetyProvider: green() },
    );

    expect(await count("notifications")).toBe(before);
  });
});

describe("7 - Fremde Benachrichtigungen", () => {
  test("A sieht die Benachrichtigungen von B nicht", async () => {
    const { author } = await makeConversation();
    const fremder = await createUser(owner);

    const own = await loadNotifications(sessionFor(author.id));
    if (own.status === "ok") {
      expect(own.entries).toHaveLength(1);
    }

    const foreign = await loadNotifications(sessionFor(fremder.id));
    if (foreign.status === "ok") {
      expect(foreign.entries).toHaveLength(0);
    }

    expect(await countUnreadNotifications(sessionFor(fremder.id))).toBe(0);
    expect(await countUnreadNotifications(sessionFor(author.id))).toBe(1);
  });

  test("A kann die Benachrichtigung von B nicht als gelesen markieren", async () => {
    const { author } = await makeConversation();
    const fremder = await createUser(owner);

    const { rows } = await owner.query<{ id: string }>(
      `SELECT id FROM notifications`,
    );
    const notificationId = rows[0].id;

    const attempt = await markNotificationRead(
      sessionFor(fremder.id),
      notificationId,
    );

    expect(attempt.status).toBe("ok");
    if (attempt.status === "ok") {
      // Null geaenderte Zeilen: die Policy hat sie gar nicht erst freigegeben.
      expect(attempt.changed).toBe(0);
    }

    const stored = await owner.query<{ read_at: Date | null }>(
      `SELECT read_at FROM notifications WHERE id = $1`,
      [notificationId],
    );
    expect(stored.rows[0].read_at).toBeNull();

    // Auch das Markieren aller trifft nur die eigenen.
    await markAllNotificationsRead(sessionFor(fremder.id));
    const after = await owner.query<{ read_at: Date | null }>(
      `SELECT read_at FROM notifications WHERE id = $1`,
      [notificationId],
    );
    expect(after.rows[0].read_at).toBeNull();

    // Der Empfaenger selbst kann es sehr wohl.
    const ok = await markNotificationRead(sessionFor(author.id), notificationId);
    if (ok.status === "ok") {
      expect(ok.changed).toBe(1);
    }
  });
});
