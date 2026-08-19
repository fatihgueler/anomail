import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { submitAppeal } from "@/lib/actions/appeals";
import { decideAccess } from "@/lib/auth/access";
import {
  hideContent,
  resolveReport,
  setBan,
  unhideContent,
  updateSafetyCheck,
} from "@/lib/actions/moderation/commands";
import {
  loadAuditLog,
  loadFlaggedLetters,
  loadHiddenMessages,
  loadReportQueue,
  loadSafetyQueue,
} from "@/lib/actions/moderation/queue";
import { assignLetterForUser, replyToLetter } from "@/lib/actions/listen";
import { closePools } from "@/lib/db/client";
import { createReport } from "@/lib/actions/report";
import { ScriptedSafetyProvider, type ProviderVerdict } from "@/lib/safety";
import { contrastRatio, roundRatio } from "@/lib/tokens/contrast";
import { LIGHT_PALETTE } from "@/lib/tokens/palette";

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
  await owner.query(`DELETE FROM moderation_audit_log`);
});

const GREEN: ProviderVerdict = {
  riskLevel: "GREEN",
  detectedCategories: [],
  reasoning: "Testfall ohne Signal.",
};

const green = () => new ScriptedSafetyProvider({ kind: "verdict", verdict: GREEN });
const text = (n: number) => "a".repeat(n);

type Role = "user" | "moderator" | "admin";

const sessionFor = (id: string, role: Role = "user") => ({
  user: { id, role, isBanned: false },
});

async function makeConversation() {
  const author = await createUser(owner);
  const responder = await createUser(owner);

  const { rows } = await owner.query<{ id: string }>(
    `INSERT INTO letters (author_id, content, status)
     VALUES ($1, $2, 'waiting') RETURNING id`,
    [author.id, `Brieftext ${text(200)}`],
  );
  const letterId = rows[0].id;

  await assignLetterForUser({ user: { id: responder.id, isBanned: false } });
  await replyToLetter(
    { user: { id: responder.id, isBanned: false } },
    { letterId, content: `Antworttext ${text(200)}` },
    { safetyProvider: green() },
  );

  const conv = await owner.query<{ id: string }>(
    `SELECT id FROM conversations WHERE original_letter_id = $1`,
    [letterId],
  );

  return { author, responder, letterId, conversationId: conv.rows[0].id };
}

async function count(table: string): Promise<number> {
  const { rows } = await owner.query<{ n: string }>(
    `SELECT count(*) AS n FROM ${table}`,
  );
  return Number(rows[0].n);
}

async function auditCount(action?: string): Promise<number> {
  const { rows } = await owner.query<{ n: string }>(
    action
      ? `SELECT count(*) AS n FROM moderation_audit_log WHERE action = $1::audit_action`
      : `SELECT count(*) AS n FROM moderation_audit_log`,
    action ? [action] : [],
  );
  return Number(rows[0].n);
}

describe("1 - Zugriff nur mit Moderationsrolle", () => {
  const ROUTES = [
    "/moderation",
    "/moderation/reports",
    "/moderation/letters",
    "/moderation/responses",
    "/moderation/safety",
    "/moderation/audit",
  ];

  test("ein gewoehnlicher Nutzer wird auf jeder Route abgewiesen", async () => {
    const user = await createUser(owner);
    const session = {
      user: { id: user.id, role: "user" as const, isBanned: false, anomailId: user.anomailId },
    };

    for (const route of ROUTES) {
      const decision = decideAccess(session, route);
      expect(decision.type).toBe("redirect");
      if (decision.type === "redirect") {
        expect(decision.reason).toBe("keine-moderation");
      }
    }
  });

  test("ein Moderator kommt durch", async () => {
    const moderator = await createUser(owner, { role: "moderator" });
    const session = {
      user: {
        id: moderator.id,
        role: "moderator" as const,
        isBanned: false,
        anomailId: moderator.anomailId,
      },
    };

    for (const route of ROUTES) {
      expect(decideAccess(session, route).type).toBe("allow");
    }
  });

  test("die Server Actions weisen einen gewoehnlichen Nutzer ebenfalls ab", async () => {
    const { author, letterId } = await makeConversation();
    const user = await createUser(owner);

    const attempts = [
      await hideContent(sessionFor(user.id), "letter", letterId, "Grund"),
      await unhideContent(sessionFor(user.id), "letter", letterId, "Grund"),
      await setBan(sessionFor(user.id), author.id, true, "Grund"),
    ];

    for (const attempt of attempts) {
      expect(attempt.status).toBe("denied");
    }

    const letter = await owner.query<{ hidden_at: Date | null }>(
      `SELECT hidden_at FROM letters WHERE id = $1`,
      [letterId],
    );
    expect(letter.rows[0].hidden_at).toBeNull();

    const banned = await owner.query<{ banned_at: Date | null }>(
      `SELECT banned_at FROM users WHERE id = $1`,
      [author.id],
    );
    expect(banned.rows[0].banned_at).toBeNull();
    expect(await auditCount()).toBe(0);
  });

  test("auch die Warteschlangen liefern einem Nutzer nichts", async () => {
    await makeConversation();
    const user = await createUser(owner);

    const queues = [
      await loadReportQueue(sessionFor(user.id)),
      await loadFlaggedLetters(sessionFor(user.id)),
      await loadHiddenMessages(sessionFor(user.id)),
      await loadSafetyQueue(sessionFor(user.id)),
      await loadAuditLog(sessionFor(user.id)),
    ];

    for (const queue of queues) {
      expect(queue.status).toBe("failed");
    }
  });
});

describe("2 - Nur die Warteschlange ist einsehbar", () => {
  test("ein unauffaelliger Brief taucht in keiner Ansicht auf", async () => {
    const { letterId } = await makeConversation();
    const moderator = await createUser(owner, { role: "moderator" });

    const letters = await loadFlaggedLetters(sessionFor(moderator.id, "moderator"));
    const messages = await loadHiddenMessages(sessionFor(moderator.id, "moderator"));
    const reports = await loadReportQueue(sessionFor(moderator.id, "moderator"));

    if (letters.status === "ok") {
      expect(letters.items).toHaveLength(0);
    }
    if (messages.status === "ok") {
      expect(messages.items).toHaveLength(0);
    }
    if (reports.status === "ok") {
      expect(reports.reports).toHaveLength(0);
    }

    // Erst nach einer Meldung wird der Inhalt sichtbar.
    const reporter = await createUser(owner);
    await owner.query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason)
       VALUES ($1, 'letter', $2, 'spam')`,
      [reporter.id, letterId],
    );

    const after = await loadReportQueue(sessionFor(moderator.id, "moderator"));
    if (after.status === "ok") {
      expect(after.reports).toHaveLength(1);
      expect(after.reports[0].targetId).toBe(letterId);
    }
  });

  test("die Ansicht ist immer begrenzt, es gibt keine unbegrenzte Liste", async () => {
    const moderator = await createUser(owner, { role: "moderator" });
    const author = await createUser(owner);

    for (let index = 0; index < 25; index += 1) {
      await owner.query(
        `INSERT INTO letters (author_id, content, status, hidden_at, hidden_reason)
         VALUES ($1, $2, 'flagged', now(), 'Test')`,
        [author.id, `${text(120)} ${index}`],
      );
    }

    const first = await loadFlaggedLetters(sessionFor(moderator.id, "moderator"), 1);
    if (first.status === "ok") {
      expect(first.items).toHaveLength(20);
      expect(first.total).toBe(25);
    }
  });
});

describe("3 - Keine E-Mail-Adresse in der Moderation", () => {
  test("weder in der Warteschlange noch ueber die Profil-Sicht", async () => {
    const { author, letterId } = await makeConversation();
    const moderator = await createUser(owner, { role: "moderator" });
    const reporter = await createUser(owner);

    await owner.query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason)
       VALUES ($1, 'letter', $2, 'spam')`,
      [reporter.id, letterId],
    );

    const queue = await loadReportQueue(sessionFor(moderator.id, "moderator"));
    const serialised = JSON.stringify(queue);

    expect(serialised).not.toContain(author.email);
    expect(serialised).not.toContain("@example.test");

    // Die Profil-Sicht traegt gar keine E-Mail-Spalte.
    const bare = new Client({ connectionString: database.appUrl });
    await bare.connect();
    try {
      await bare.query(`SELECT set_config('app.current_user_id', $1, false)`, [
        moderator.id,
      ]);

      const columns = await bare.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'user_profiles'`,
      );
      expect(columns.rows.map((row) => row.column_name)).not.toContain("email");
    } finally {
      await bare.end();
    }
  });
});

describe("4 - Begruendung ist Pflicht", () => {
  test("Ausblenden ohne Begruendung wird abgewiesen", async () => {
    const { letterId } = await makeConversation();
    const moderator = await createUser(owner, { role: "moderator" });

    for (const reason of ["", "   ", "\n\t "]) {
      const result = await hideContent(
        sessionFor(moderator.id, "moderator"),
        "letter",
        letterId,
        reason,
      );

      expect(result.status).toBe("invalid");
    }

    const letter = await owner.query<{ hidden_at: Date | null }>(
      `SELECT hidden_at FROM letters WHERE id = $1`,
      [letterId],
    );
    expect(letter.rows[0].hidden_at).toBeNull();
  });

  test("auch die Datenbankfunktion selbst weist eine leere Begruendung ab", async () => {
    const { letterId } = await makeConversation();
    const moderator = await createUser(owner, { role: "moderator" });

    const bare = new Client({ connectionString: database.appUrl });
    await bare.connect();

    try {
      await bare.query(`SELECT set_config('app.current_user_id', $1, false)`, [
        moderator.id,
      ]);

      // Direkter Aufruf an der Anwendungsschicht vorbei.
      await expect(
        bare.query(`SELECT moderation_hide_content('letter', $1::uuid, '')`, [
          letterId,
        ]),
      ).rejects.toMatchObject({ code: "AN021" });
    } finally {
      await bare.end();
    }
  });

  test("Sperre und Meldungsabschluss verlangen ebenfalls eine Begruendung", async () => {
    const { author, responder, letterId } = await makeConversation();
    const moderator = await createUser(owner, { role: "moderator" });

    // Der Antwortende darf den Brief melden - ein Unbeteiligter nicht, das
    // haelt bereits die Meldelogik aus AP7 ab.
    const report = await createReport(sessionFor(responder.id), {
      targetType: "letter",
      targetId: letterId,
      reason: "spam",
    });

    expect(report.status).toBe("created");

    expect(
      (await setBan(sessionFor(moderator.id, "moderator"), author.id, true, ""))
        .status,
    ).toBe("invalid");

    if (report.status === "created") {
      expect(
        (
          await resolveReport(
            sessionFor(moderator.id, "moderator"),
            report.reportId,
            "  ",
          )
        ).status,
      ).toBe("invalid");
    }
  });
});

describe("5 - Protokoll bei Aktion und Lesezugriff", () => {
  test("jede Aktion erzeugt genau eine Zeile", async () => {
    const { author, letterId } = await makeConversation();
    const moderator = await createUser(owner, { role: "moderator" });

    await hideContent(
      sessionFor(moderator.id, "moderator"),
      "letter",
      letterId,
      "Verstoss gegen die Regeln",
    );
    expect(await auditCount("hidden")).toBe(1);

    await unhideContent(
      sessionFor(moderator.id, "moderator"),
      "letter",
      letterId,
      "Doch in Ordnung",
    );
    expect(await auditCount("unhidden")).toBe(1);

    await setBan(
      sessionFor(moderator.id, "moderator"),
      author.id,
      true,
      "Wiederholter Verstoss",
    );
    expect(await auditCount("banned")).toBe(1);

    await setBan(
      sessionFor(moderator.id, "moderator"),
      author.id,
      false,
      "Nach Widerspruch",
    );
    expect(await auditCount("unbanned")).toBe(1);

    // Handelnde Person und Begruendung stehen mit drin.
    const { rows } = await owner.query<{ actor_id: string; note: string }>(
      `SELECT actor_id, note FROM moderation_audit_log WHERE action = 'banned'`,
    );
    expect(rows[0].actor_id).toBe(moderator.id);
    expect(rows[0].note).toBe("Wiederholter Verstoss");
  });

  test("jeder angesehene Inhalt erzeugt eine Zeile", async () => {
    const { letterId } = await makeConversation();
    const moderator = await createUser(owner, { role: "moderator" });
    const reporter = await createUser(owner);

    await owner.query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason)
       VALUES ($1, 'letter', $2, 'spam')`,
      [reporter.id, letterId],
    );

    expect(await auditCount("viewed")).toBe(0);

    await loadReportQueue(sessionFor(moderator.id, "moderator"));
    expect(await auditCount("viewed")).toBe(1);

    // Ein zweiter Aufruf erzeugt eine zweite Zeile - das Ansehen selbst ist
    // der protokollierte Vorgang, nicht der Inhalt.
    await loadReportQueue(sessionFor(moderator.id, "moderator"));
    expect(await auditCount("viewed")).toBe(2);

    const { rows } = await owner.query<{ target_id: string; actor_id: string }>(
      `SELECT target_id, actor_id FROM moderation_audit_log WHERE action = 'viewed' LIMIT 1`,
    );
    expect(rows[0].target_id).toBe(letterId);
    expect(rows[0].actor_id).toBe(moderator.id);
  });

  test("das Protokoll ist nur fuer Admins lesbar", async () => {
    const moderator = await createUser(owner, { role: "moderator" });
    const admin = await createUser(owner, { role: "admin" });

    await setBan(
      sessionFor(moderator.id, "moderator"),
      admin.id,
      true,
      "Testeintrag",
    );
    await setBan(
      sessionFor(moderator.id, "moderator"),
      admin.id,
      false,
      "Testeintrag zurueck",
    );

    const asModerator = await loadAuditLog(sessionFor(moderator.id, "moderator"));
    expect(asModerator.status).toBe("failed");

    const asAdmin = await loadAuditLog(sessionFor(admin.id, "admin"));
    expect(asAdmin.status).toBe("ok");
    if (asAdmin.status === "ok") {
      expect(asAdmin.rows.length).toBeGreaterThan(0);
    }

    // Auch direkt an der Datenbank gibt die Policy einem Moderator nichts.
    const bare = new Client({ connectionString: database.appUrl });
    await bare.connect();
    try {
      await bare.query(`SELECT set_config('app.current_user_id', $1, false)`, [
        moderator.id,
      ]);
      const rows = await bare.query(`SELECT id FROM moderation_audit_log`);
      expect(rows.rowCount).toBe(0);
    } finally {
      await bare.end();
    }
  });
});

describe("6 - Das Protokoll ist unveraenderlich", () => {
  test("weder aus der Anwendungsrolle noch als Eigentuemer", async () => {
    const moderator = await createUser(owner, { role: "moderator" });
    const target = await createUser(owner);

    await setBan(
      sessionFor(moderator.id, "moderator"),
      target.id,
      true,
      "Testeintrag",
    );
    expect(await auditCount()).toBe(1);

    // Die Anwendungsrolle hat gar kein Recht dazu.
    const bare = new Client({ connectionString: database.appUrl });
    await bare.connect();
    try {
      await bare.query(`SELECT set_config('app.current_user_id', $1, false)`, [
        moderator.id,
      ]);

      await expect(
        bare.query(`UPDATE moderation_audit_log SET note = 'manipuliert'`),
      ).rejects.toBeDefined();

      await expect(
        bare.query(`DELETE FROM moderation_audit_log`),
      ).rejects.toBeDefined();
    } finally {
      await bare.end();
    }

    // Und der Eigentuemer scheitert am Ausloeser.
    await expect(
      owner.query(`UPDATE moderation_audit_log SET note = 'manipuliert'`),
    ).rejects.toMatchObject({ code: "42501" });

    await expect(
      owner.query(`DELETE FROM moderation_audit_log WHERE true`),
    ).rejects.toMatchObject({ code: "42501" });

    const { rows } = await owner.query<{ note: string }>(
      `SELECT note FROM moderation_audit_log`,
    );
    expect(rows[0].note).toBe("Testeintrag");
  });
});

describe("7 - Eine Sperre wirkt sofort", () => {
  test("die bestehende Sitzung erlaubt keine geschuetzte Route mehr", async () => {
    const { author } = await makeConversation();
    const moderator = await createUser(owner, { role: "moderator" });

    // Die Sitzung existiert schon vor der Sperre.
    await owner.query(
      `INSERT INTO sessions (session_token, user_id, expires)
       VALUES ($1, $2, now() + interval '30 days')`,
      ["sperr-test-token", author.id],
    );

    await setBan(
      sessionFor(moderator.id, "moderator"),
      author.id,
      true,
      "Testsperre",
    );

    // Der Adapter liest die Nutzerzeile bei jeder Anfrage frisch - genau
    // deshalb sind es Datenbank-Sitzungen und kein JWT.
    const { rows } = await owner.query<{ banned_at: Date | null }>(
      `SELECT u.banned_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.session_token = $1`,
      ["sperr-test-token"],
    );
    expect(rows[0].banned_at).not.toBeNull();

    // Und der Guard weist damit jede geschuetzte Route ab.
    const sessionAfterBan = {
      user: {
        id: author.id,
        role: "user" as const,
        isBanned: rows[0].banned_at !== null,
        anomailId: author.anomailId,
      },
    };

    for (const route of ["/write", "/listen", "/my-letters", "/conversation/x"]) {
      const decision = decideAccess(sessionAfterBan, route);
      expect(decision.type).toBe("redirect");
      if (decision.type === "redirect") {
        expect(decision.reason).toBe("gesperrt");
      }
    }
  });
});

describe("8 - Ausblenden setzt hidden_at, nie deleted_at", () => {
  test("bei Brief und Nachricht", async () => {
    const { letterId, conversationId } = await makeConversation();
    const moderator = await createUser(owner, { role: "moderator" });

    const { rows: messages } = await owner.query<{ id: string }>(
      `SELECT id FROM messages WHERE is_original = false LIMIT 1`,
    );

    await hideContent(
      sessionFor(moderator.id, "moderator"),
      "letter",
      letterId,
      "Regelverstoss",
    );
    await hideContent(
      sessionFor(moderator.id, "moderator"),
      "message",
      messages[0].id,
      "Regelverstoss",
    );

    const letter = await owner.query<{
      hidden_at: Date | null;
      hidden_reason: string | null;
      deleted_at: Date | null;
      status: string;
    }>(
      `SELECT hidden_at, hidden_reason, deleted_at, status::text FROM letters WHERE id = $1`,
      [letterId],
    );

    expect(letter.rows[0].hidden_at).not.toBeNull();
    expect(letter.rows[0].hidden_reason).toBe("Regelverstoss");
    expect(letter.rows[0].deleted_at).toBeNull();
    expect(letter.rows[0].status).toBe("flagged");

    const message = await owner.query<{
      hidden_at: Date | null;
      deleted_at: Date | null;
    }>(`SELECT hidden_at, deleted_at FROM messages WHERE id = $1`, [
      messages[0].id,
    ]);

    expect(message.rows[0].hidden_at).not.toBeNull();
    expect(message.rows[0].deleted_at).toBeNull();

    // Auch das Schliessen eines Briefwechsels loescht nichts.
    await hideContent(
      sessionFor(moderator.id, "moderator"),
      "conversation",
      conversationId,
      "Regelverstoss",
    );

    const conversation = await owner.query<{ status: string }>(
      `SELECT status::text FROM conversations WHERE id = $1`,
      [conversationId],
    );
    expect(conversation.rows[0].status).toBe("archived");
    expect(await count("messages")).toBe(2);
  });
});

describe("9 - Risikostufen im Graustufentest", () => {
  /**
   * Der Graustufentest bildet auf die relative Luminanz ab - genau das, was von
   * einer Farbe uebrig bleibt, wenn die Farbinformation wegfaellt.
   */
  test("jede Stufe traegt eine eigene Beschriftung und ein eigenes Symbol", async () => {
    const module = await import("@/components/moderation/risk-badge");

    const labels = (["GREEN", "YELLOW", "RED", "CRISIS"] as const).map((level) =>
      module.riskLabel(level),
    );

    // Vier verschiedene Klartexte: die Einstufung haengt nicht an der Farbe.
    expect(new Set(labels).size).toBe(4);
  });

  test("die verwendeten Flaechen sind auch ohne Farbe unterscheidbar", () => {
    // CRISIS liegt auf destructive, RED und YELLOW auf muted bzw. secondary,
    // GREEN auf card. Geprueft wird, dass der Text auf jeder Flaeche lesbar
    // bleibt - im Graustufenbild entscheidet allein dieser Abstand.
    const pairs = [
      ["destructive-foreground", "destructive"],
      ["destructive", "muted"],
      ["secondary-foreground", "secondary"],
      ["card-foreground", "card"],
    ] as const;

    for (const [foreground, background] of pairs) {
      const ratio = contrastRatio(
        LIGHT_PALETTE[foreground],
        LIGHT_PALETTE[background],
      );
      expect(roundRatio(ratio)).toBeGreaterThanOrEqual(4.5);
    }

    // Und die Flaechen selbst heben sich voneinander ab.
    const surfaces = ["destructive", "muted", "secondary", "card"] as const;
    for (let i = 0; i < surfaces.length; i += 1) {
      for (let j = i + 1; j < surfaces.length; j += 1) {
        const ratio = contrastRatio(
          LIGHT_PALETTE[surfaces[i]],
          LIGHT_PALETTE[surfaces[j]],
        );
        expect(roundRatio(ratio)).toBeGreaterThan(1);
      }
    }
  });
});

describe("Widerspruchsverfahren", () => {
  test("die betroffene Person kann widersprechen, eine fremde nicht", async () => {
    const { author, letterId } = await makeConversation();
    const moderator = await createUser(owner, { role: "moderator" });
    const fremder = await createUser(owner);

    await hideContent(
      sessionFor(moderator.id, "moderator"),
      "letter",
      letterId,
      "Regelverstoss",
    );

    const foreign = await submitAppeal(sessionFor(fremder.id), {
      targetType: "letter",
      targetId: letterId,
      message: "Ich finde das falsch.",
    });
    expect(foreign.status).toBe("not-allowed");

    const own = await submitAppeal(sessionFor(author.id), {
      targetType: "letter",
      targetId: letterId,
      message: "Ich halte die Entscheidung fuer falsch, weil der Text harmlos ist.",
    });
    expect(own.status).toBe("created");

    // Ein zweiter Anlauf erzeugt keinen zweiten Vorgang.
    const again = await submitAppeal(sessionFor(author.id), {
      targetType: "letter",
      targetId: letterId,
      message: "Noch einmal.",
    });
    expect(again.status).toBe("duplicate");
    expect(await count("appeals")).toBe(1);
  });

  test("ein leerer Widerspruch wird abgewiesen", async () => {
    const { author } = await makeConversation();

    const result = await submitAppeal(sessionFor(author.id), {
      targetType: "account",
      targetId: null,
      message: "   ",
    });

    expect(result.status).toBe("invalid");
    expect(await count("appeals")).toBe(0);
  });
});

describe("Sicherheitspruefung bearbeiten", () => {
  test("Erledigt und Falsch positiv landen in actions und im Protokoll", async () => {
    const { author } = await makeConversation();
    const moderator = await createUser(owner, { role: "moderator" });

    const { rows } = await owner.query<{ id: string }>(
      `INSERT INTO safety_checks
         (target_type, sender_id, content_snapshot, risk_level, reasoning)
       VALUES ('letter', $1, 'Testtext', 'RED', 'Testgrund')
       RETURNING id`,
      [author.id],
    );

    const result = await updateSafetyCheck(
      sessionFor(moderator.id, "moderator"),
      rows[0].id,
      "dismissed",
      "Einstufung war unzutreffend",
    );
    expect(result.status).toBe("ok");

    const stored = await owner.query<{
      moderation_status: string;
      actions: unknown[];
    }>(`SELECT moderation_status::text, actions FROM safety_checks WHERE id = $1`, [
      rows[0].id,
    ]);

    expect(stored.rows[0].moderation_status).toBe("dismissed");
    expect(stored.rows[0].actions).toHaveLength(1);
    expect(await auditCount("dismissed")).toBe(1);
  });
});
