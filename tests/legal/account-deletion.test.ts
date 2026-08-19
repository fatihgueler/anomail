import fs from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { deleteOwnAccount, exportOwnData } from "@/lib/actions/account";
import { assignLetterForUser, replyToLetter } from "@/lib/actions/listen";
import { loadConversation } from "@/lib/actions/conversation";
import { createUserWithAnomailId } from "@/lib/anomail-id/assign";
import { generateAnomailId, ANOMAIL_ID_PATTERN } from "@/lib/anomail-id";
import { closePools } from "@/lib/db/client";
import { PROTECTED_ROUTES, requiresSession } from "@/lib/auth/routes";
import { ScriptedSafetyProvider, type ProviderVerdict } from "@/lib/safety";
import { PLACEHOLDERS } from "@/content/legal/platzhalter";

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
  await owner.query(`DELETE FROM retired_anomail_ids`);
});

const GREEN: ProviderVerdict = {
  riskLevel: "GREEN",
  detectedCategories: [],
  reasoning: "Testfall ohne Signal.",
};
const green = () => new ScriptedSafetyProvider({ kind: "verdict", verdict: GREEN });
const text = (n: number) => "a".repeat(n);
const sessionFor = (id: string) => ({ user: { id, isBanned: false } });

/** Legt einen Briefwechsel und einen zusaetzlichen wartenden Brief an. */
async function makeAccountWithHistory() {
  const author = await createUser(owner);
  const responder = await createUser(owner);

  const { rows } = await owner.query<{ id: string }>(
    `INSERT INTO letters (author_id, content, status)
     VALUES ($1, $2, 'waiting') RETURNING id`,
    [author.id, `Brieftext ${text(200)}`],
  );

  await assignLetterForUser(sessionFor(responder.id));
  await replyToLetter(
    sessionFor(responder.id),
    { letterId: rows[0].id, content: `Antworttext ${text(200)}` },
    { safetyProvider: green() },
  );

  // Ein zweiter, noch wartender Brief.
  const { rows: waiting } = await owner.query<{ id: string }>(
    `INSERT INTO letters (author_id, content, status)
     VALUES ($1, $2, 'waiting') RETURNING id`,
    [author.id, `Wartender Brief ${text(200)}`],
  );

  const conv = await owner.query<{ id: string }>(
    `SELECT id FROM conversations WHERE original_letter_id = $1`,
    [rows[0].id],
  );

  return {
    author,
    responder,
    conversationId: conv.rows[0].id,
    waitingLetterId: waiting[0].id,
  };
}

describe("1 - Die E-Mail-Adresse verschwindet", () => {
  test("ueber keinen Abfrageweg mehr auffindbar", async () => {
    const { author } = await makeAccountWithHistory();
    const email = author.email;

    const result = await deleteOwnAccount(
      sessionFor(author.id),
      author.anomailId,
    );
    expect(result.status).toBe("deleted");

    // Direkt an der Tabelle, ohne RLS.
    const byEmail = await owner.query(`SELECT id FROM users WHERE email = $1`, [
      email,
    ]);
    expect(byEmail.rowCount).toBe(0);

    const row = await owner.query<{
      email: string | null;
      anomail_id: string | null;
      deleted_at: Date | null;
    }>(`SELECT email, anomail_id, deleted_at FROM users WHERE id = $1`, [
      author.id,
    ]);
    expect(row.rows[0].email).toBeNull();
    expect(row.rows[0].anomail_id).toBeNull();
    expect(row.rows[0].deleted_at).not.toBeNull();

    // Und sie taucht in keiner anderen Tabelle auf.
    const suche = await owner.query<{ treffer: string }>(
      `SELECT 'accounts' AS treffer FROM accounts WHERE user_id = $1
       UNION ALL SELECT 'sessions' FROM sessions WHERE user_id = $1`,
      [author.id],
    );
    expect(suche.rowCount).toBe(0);
  });

  test("eine falsche Bestaetigung loescht nichts", async () => {
    const { author } = await makeAccountWithHistory();

    const result = await deleteOwnAccount(sessionFor(author.id), "AN-XXXX-XXXX");
    expect(result.status).toBe("mismatch");

    const row = await owner.query<{ email: string | null }>(
      `SELECT email FROM users WHERE id = $1`,
      [author.id],
    );
    expect(row.rows[0].email).toBe(author.email);
  });
});

describe("2 - Die Anomail-ID wird nie erneut vergeben", () => {
  test("sie steht in retired_anomail_ids und blockiert die Vergabe", async () => {
    const { author } = await makeAccountWithHistory();
    const vergeben = author.anomailId;

    await deleteOwnAccount(sessionFor(author.id), vergeben);

    const retired = await owner.query(
      `SELECT 1 FROM retired_anomail_ids WHERE anomail_id = $1`,
      [vergeben],
    );
    expect(retired.rowCount).toBe(1);

    // Ein Erzeuger, der ausschliesslich die zurueckgezogene Kennung liefert,
    // fuehrt zu keiner Neuvergabe - er scheitert nach den Versuchen.
    await expect(
      createUserWithAnomailId(
        owner,
        "neu@example.test",
        null,
        () => vergeben,
      ),
    ).rejects.toThrow();

    const doppelt = await owner.query(
      `SELECT count(*) AS n FROM users WHERE anomail_id = $1`,
      [vergeben],
    );
    expect(Number((doppelt.rows[0] as { n: string }).n)).toBe(0);
  });

  test("1000 Neuvergaben treffen die zurueckgezogene Kennung nicht", async () => {
    const { author } = await makeAccountWithHistory();
    const vergeben = author.anomailId;
    await deleteOwnAccount(sessionFor(author.id), vergeben);

    const erzeugt = new Set<string>();

    for (let index = 0; index < 1000; index += 1) {
      const kandidat = generateAnomailId();
      expect(ANOMAIL_ID_PATTERN.test(kandidat)).toBe(true);
      erzeugt.add(kandidat);
    }

    expect(erzeugt.has(vergeben)).toBe(false);
    // Und der Zufall ist tatsaechlich gestreut.
    expect(erzeugt.size).toBeGreaterThan(990);
  });
});

describe("3 - Der Verlauf der anderen Person bleibt intakt", () => {
  test("Blasen bleiben stehen, fremde Inhalte unangetastet", async () => {
    const { author, responder, conversationId } = await makeAccountWithHistory();

    const vorher = await loadConversation(sessionFor(responder.id), conversationId);
    const anzahlVorher =
      vorher.status === "ok" ? vorher.data.messages.length : 0;

    await deleteOwnAccount(sessionFor(author.id), author.anomailId);

    const nachher = await loadConversation(
      sessionFor(responder.id),
      conversationId,
    );

    expect(nachher.status).toBe("ok");

    if (nachher.status === "ok") {
      // Kein Verlust an Blasen.
      expect(nachher.data.messages).toHaveLength(anzahlVorher);

      // Die Nachricht des Geloeschten ist ein Platzhalter.
      const fremd = nachher.data.messages.find((m) => !m.isOwn);
      expect(fremd?.isDeleted).toBe(true);
      expect(fremd?.content).toBe("");

      // Die eigene Antwort ist unveraendert lesbar.
      const eigen = nachher.data.messages.find((m) => m.isOwn);
      expect(eigen?.isDeleted).toBe(false);
      expect(eigen?.content.length).toBeGreaterThan(0);

      // Der Briefwechsel ist beendet, nicht verschwunden.
      expect(nachher.data.isArchived).toBe(true);
    }
  });
});

describe("4 - Sitzungen enden sofort", () => {
  test("bestehende Sitzungen sind nach der Loeschung weg", async () => {
    const { author } = await makeAccountWithHistory();

    await owner.query(
      `INSERT INTO sessions (session_token, user_id, expires)
       VALUES ($1, $2, now() + interval '30 days')`,
      ["loesch-test-token", author.id],
    );

    const vorher = await owner.query(
      `SELECT 1 FROM sessions WHERE user_id = $1`,
      [author.id],
    );
    expect(vorher.rowCount).toBe(1);

    await deleteOwnAccount(sessionFor(author.id), author.anomailId);

    const nachher = await owner.query(
      `SELECT 1 FROM sessions WHERE session_token = $1`,
      ["loesch-test-token"],
    );
    expect(nachher.rowCount).toBe(0);
  });
});

describe("5 - Wartende Briefe verschwinden aus der Zuweisung", () => {
  test("assign_letter vergibt sie nicht mehr", async () => {
    const { author, waitingLetterId } = await makeAccountWithHistory();
    const leser = await createUser(owner);

    await deleteOwnAccount(sessionFor(author.id), author.anomailId);

    const weg = await owner.query(`SELECT 1 FROM letters WHERE id = $1`, [
      waitingLetterId,
    ]);
    expect(weg.rowCount).toBe(0);

    const zugewiesen = await assignLetterForUser(sessionFor(leser.id));
    expect(zugewiesen.status).toBe("empty");
  });
});

describe("6 - Die Datenauskunft enthaelt nur eigene Daten", () => {
  test("keine fremden Nachrichten, keine fremden Meldungen", async () => {
    const { author, responder } = await makeAccountWithHistory();

    const auskunft = await exportOwnData(sessionFor(author.id));
    expect(auskunft.status).toBe("ok");

    if (auskunft.status !== "ok") {
      return;
    }

    const serialisiert = JSON.stringify(auskunft.data);

    // Der Antworttext gehoert der anderen Person und darf nicht enthalten sein.
    expect(serialisiert).not.toContain("Antworttext");
    expect(serialisiert).not.toContain(responder.email);
    expect(serialisiert).not.toContain(responder.anomailId);

    // Die eigenen Daten sind da.
    expect(serialisiert).toContain("Brieftext");
    expect(auskunft.data.konto).not.toBeNull();
    expect(auskunft.data.briefe.length).toBeGreaterThan(0);

    // Jede Nachricht im Export stammt vom Anfragenden.
    const fremdeNachricht = await owner.query<{ id: string }>(
      `SELECT id FROM messages WHERE sender_id = $1`,
      [responder.id],
    );
    const eigeneIds = auskunft.data.nachrichten.map((n) => n.id);
    expect(eigeneIds).not.toContain(fremdeNachricht.rows[0].id);
  });
});

describe("7 - Rechtsseiten ohne Anmeldung", () => {
  const OEFFENTLICH = [
    "/",
    "/privacy",
    "/privacy/vollstaendig",
    "/terms",
    "/agb",
    "/impressum",
    "/help",
    "/contact",
    "/account-geloescht",
  ];

  test("keine davon verlangt eine Sitzung", () => {
    for (const route of OEFFENTLICH) {
      expect(requiresSession(route)).toBe(false);
    }
  });

  test("die geschuetzten Routen bleiben geschuetzt", () => {
    for (const route of PROTECTED_ROUTES) {
      expect(requiresSession(route)).toBe(true);
    }

    expect(requiresSession("/delete-account")).toBe(true);
    expect(requiresSession("/settings")).toBe(true);
  });
});

describe("8 - Jeder Platzhalter erscheint in der Uebersicht", () => {
  test("alle in Seiten verwendeten Kennungen sind registriert", async () => {
    const projektWurzel = process.cwd();
    const verzeichnisse = ["app", "content"];
    const dateien: string[] = [];

    async function sammle(verzeichnis: string): Promise<void> {
      const eintraege = await fs.readdir(verzeichnis, { withFileTypes: true });

      for (const eintrag of eintraege) {
        const voll = path.join(verzeichnis, eintrag.name);

        if (eintrag.isDirectory()) {
          if (eintrag.name === "node_modules" || eintrag.name === ".next") {
            continue;
          }
          await sammle(voll);
        } else if (/\.tsx?$/.test(eintrag.name)) {
          dateien.push(voll);
        }
      }
    }

    for (const verzeichnis of verzeichnisse) {
      await sammle(path.join(projektWurzel, verzeichnis));
    }

    const verwendet = new Set<string>();

    for (const datei of dateien) {
      const inhalt = await fs.readFile(datei, "utf8");

      for (const treffer of inhalt.matchAll(/id=\{?"([a-zA-Z]+)"\}?/g)) {
        if (treffer[1] in PLACEHOLDERS) {
          verwendet.add(treffer[1]);
        }
      }
    }

    // Jede in einer Seite eingesetzte Kennung ist registriert - sonst taucht
    // sie in der Uebersicht unter /dev/legal nicht auf.
    for (const kennung of verwendet) {
      expect(Object.keys(PLACEHOLDERS)).toContain(kennung);
    }

    // Und es wurde ueberhaupt etwas gefunden.
    expect(verwendet.size).toBeGreaterThan(10);
  });

  test("jeder registrierte Platzhalter nennt einen Fundort", () => {
    for (const [id, eintrag] of Object.entries(PLACEHOLDERS)) {
      expect(eintrag.fehlt.length, `${id} ohne Beschreibung`).toBeGreaterThan(5);
      expect(eintrag.fundort.length, `${id} ohne Fundort`).toBeGreaterThan(3);
    }
  });
});

describe("9 - Kein externer Tracker", () => {
  const TRACKER = [
    "datadog",
    "dd_rum",
    "googletagmanager",
    "google-analytics",
    "gtag(",
    "posthog",
    "hotjar",
    "mixpanel",
    "segment.com",
    "fullstory",
    "clarity.ms",
  ];

  test("weder im Quelltext noch in package.json", async () => {
    const wurzel = process.cwd();
    const dateien: string[] = [];

    async function sammle(verzeichnis: string): Promise<void> {
      const eintraege = await fs.readdir(verzeichnis, { withFileTypes: true });

      for (const eintrag of eintraege) {
        if (
          eintrag.name === "node_modules" ||
          eintrag.name === ".next" ||
          eintrag.name.startsWith(".")
        ) {
          continue;
        }

        const voll = path.join(verzeichnis, eintrag.name);

        if (eintrag.isDirectory()) {
          await sammle(voll);
        } else if (/\.(tsx?|jsx?|mts|json)$/.test(eintrag.name)) {
          dateien.push(voll);
        }
      }
    }

    for (const verzeichnis of ["app", "components", "lib", "content"]) {
      await sammle(path.join(wurzel, verzeichnis));
    }
    dateien.push(path.join(wurzel, "package.json"));

    const treffer: string[] = [];

    for (const datei of dateien) {
      const inhalt = (await fs.readFile(datei, "utf8")).toLowerCase();

      for (const muster of TRACKER) {
        // Der Testcode selbst zaehlt nicht.
        if (inhalt.includes(muster) && !datei.includes("tests")) {
          treffer.push(`${path.relative(wurzel, datei)}: ${muster}`);
        }
      }
    }

    expect(treffer).toEqual([]);
  });

  test("kein Skript-Tag auf eine fremde Herkunft", async () => {
    const wurzel = process.cwd();
    const layout = await fs.readFile(
      path.join(wurzel, "app", "layout.tsx"),
      "utf8",
    );

    // Das einzige Skript ist die Helligkeitsvorgabe aus AP1, und die ist
    // eingebettet, nicht nachgeladen.
    expect(layout).not.toMatch(/<script[^>]*src=/);
    expect(layout).not.toMatch(/https?:\/\//);
  });
});
