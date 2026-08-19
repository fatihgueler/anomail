import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

import * as schema from "./schema";

/**
 * Seed-Daten fuer die lokale Entwicklung.
 *
 * Laeuft als Eigentuemer und umgeht damit RLS - das ist hier richtig, weil der
 * Seed Zeilen fuer mehrere Nutzer anlegt. Die Anwendung selbst verbindet sich
 * nie so, siehe lib/db/client.ts.
 *
 * Alle Texte sind bewusst unauffaellige Platzhalter. Erfundene Krisen-
 * schilderungen haetten in einem Testdatensatz nichts zu suchen.
 */

export const CATEGORY_SEED = [
  { slug: "beziehung", label: "Beziehung" },
  { slug: "familie", label: "Familie" },
  { slug: "einsamkeit", label: "Einsamkeit" },
  { slug: "arbeit", label: "Arbeit" },
  { slug: "schule", label: "Schule" },
  { slug: "hoffnung", label: "Hoffnung" },
  { slug: "persoenliches", label: "Persönliches" },
  { slug: "sonstiges", label: "Sonstiges" },
] as const;

type Db = NodePgDatabase<typeof schema>;

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000);

/** Leert die Tabellen in einer Reihenfolge, die keine Fremdschluessel verletzt. */
async function clear(db: Db) {
  await db.execute(sql`
    TRUNCATE TABLE
      safety_checks,
      notifications,
      blocks,
      reports,
      messages,
      conversations,
      letter_categories,
      letters,
      categories,
      users
    RESTART IDENTITY CASCADE
  `);
}

export async function runSeed(db: Db) {
  await clear(db);

  const categories = await db
    .insert(schema.categories)
    .values([...CATEGORY_SEED])
    .returning();

  const bySlug = new Map(categories.map((c) => [c.slug, c.id]));

  const [anna, ben, clara, dario, eva] = await db
    .insert(schema.users)
    .values([
      { email: "anna@example.test", anomailId: "AN-4KTP-9WXR", role: "user" },
      { email: "ben@example.test", anomailId: "AN-7QMD-3HVZ", role: "user" },
      {
        email: "clara@example.test",
        anomailId: "AN-2JFN-8RKS",
        role: "moderator",
      },
      {
        email: "dario@example.test",
        anomailId: "AN-6XBT-5PQW",
        role: "user",
        bannedAt: minutesAgo(60 * 24 * 3),
        bannedReason: "Wiederholte Verstoesse gegen die Regeln.",
      },
      { email: "eva@example.test", anomailId: "AN-9GHL-4TCM", role: "user" },
    ])
    .returning();

  const letters = await db
    .insert(schema.letters)
    .values([
      // Drei wartende Briefe, aeltester zuerst.
      {
        authorId: anna.id,
        content:
          "Ein Platzhaltertext für einen wartenden Brief. Nur zum Testen der Zuweisung.",
        status: "waiting",
        createdAt: minutesAgo(600),
      },
      {
        authorId: ben.id,
        content: "Zweiter Platzhaltertext. Dieser Brief wartet ebenfalls.",
        status: "waiting",
        createdAt: minutesAgo(400),
      },
      {
        authorId: eva.id,
        content: "Dritter Platzhaltertext für einen wartenden Brief.",
        status: "waiting",
        createdAt: minutesAgo(200),
      },
      // Zuweisung abgelaufen: aelter als zehn Minuten.
      {
        authorId: anna.id,
        content: "Platzhaltertext mit abgelaufener Zuweisung.",
        status: "in_progress",
        responderId: ben.id,
        assignedAt: minutesAgo(30),
        createdAt: minutesAgo(300),
      },
      // Zuweisung noch gueltig: release_expired_leases darf hier nichts tun.
      {
        authorId: ben.id,
        content: "Platzhaltertext mit noch laufender Zuweisung.",
        status: "in_progress",
        responderId: eva.id,
        assignedAt: minutesAgo(2),
        createdAt: minutesAgo(150),
      },
      // Zwei beantwortete Briefe, jeweils Grundlage einer Conversation.
      {
        authorId: eva.id,
        content: "Platzhaltertext für einen beantworteten Brief.",
        status: "answered",
        responderId: anna.id,
        assignedAt: minutesAgo(500),
        answeredAt: minutesAgo(480),
        createdAt: minutesAgo(520),
      },
      {
        authorId: anna.id,
        content: "Zweiter Platzhaltertext für einen beantworteten Brief.",
        status: "answered",
        responderId: ben.id,
        assignedAt: minutesAgo(360),
        answeredAt: minutesAgo(340),
        createdAt: minutesAgo(380),
      },
      // Von der Moderation zurueckgehalten. hidden_at, nicht deleted_at.
      {
        authorId: ben.id,
        content: "Platzhaltertext für einen zurückgehaltenen Brief.",
        status: "flagged",
        hiddenAt: minutesAgo(100),
        hiddenReason: "Zur Prüfung durch die Moderation zurückgehalten.",
        createdAt: minutesAgo(120),
      },
    ])
    .returning();

  await db.insert(schema.letterCategories).values([
    { letterId: letters[0].id, categoryId: bySlug.get("einsamkeit")! },
    { letterId: letters[0].id, categoryId: bySlug.get("hoffnung")! },
    { letterId: letters[1].id, categoryId: bySlug.get("arbeit")! },
    { letterId: letters[2].id, categoryId: bySlug.get("familie")! },
    { letterId: letters[3].id, categoryId: bySlug.get("schule")! },
    { letterId: letters[4].id, categoryId: bySlug.get("beziehung")! },
    { letterId: letters[5].id, categoryId: bySlug.get("persoenliches")! },
    { letterId: letters[6].id, categoryId: bySlug.get("sonstiges")! },
    { letterId: letters[7].id, categoryId: bySlug.get("sonstiges")! },
  ]);

  const [conversationOne, conversationTwo] = await db
    .insert(schema.conversations)
    .values([
      {
        originalLetterId: letters[5].id,
        participantAId: eva.id,
        participantBId: anna.id,
        status: "active",
        createdAt: minutesAgo(480),
      },
      {
        originalLetterId: letters[6].id,
        participantAId: anna.id,
        participantBId: ben.id,
        status: "active",
        createdAt: minutesAgo(340),
      },
    ])
    .returning();

  const messages = await db.insert(schema.messages).values([
    // Die erste Nachricht ist immer die Kopie des urspruenglichen Briefs.
    {
      conversationId: conversationOne.id,
      senderId: eva.id,
      content: "Platzhaltertext für einen beantworteten Brief.",
      isOriginal: true,
      createdAt: minutesAgo(480),
    },
    {
      conversationId: conversationOne.id,
      senderId: anna.id,
      content: "Platzhalter für die erste Antwort in diesem Briefwechsel.",
      createdAt: minutesAgo(470),
    },
    {
      conversationId: conversationOne.id,
      senderId: eva.id,
      content: "Platzhalter für eine Rückmeldung.",
      createdAt: minutesAgo(460),
    },
    {
      conversationId: conversationOne.id,
      senderId: anna.id,
      content: "Platzhalter für eine weitere Nachricht.",
      createdAt: minutesAgo(450),
    },
    {
      conversationId: conversationTwo.id,
      senderId: anna.id,
      content: "Zweiter Platzhaltertext für einen beantworteten Brief.",
      isOriginal: true,
      createdAt: minutesAgo(340),
    },
    {
      conversationId: conversationTwo.id,
      senderId: ben.id,
      content: "Platzhalter für die Antwort im zweiten Briefwechsel.",
      createdAt: minutesAgo(330),
    },
    {
      conversationId: conversationTwo.id,
      senderId: anna.id,
      content: "Platzhalter für eine kurze Rückmeldung.",
      createdAt: minutesAgo(320),
    },
  ]).returning();

  // Die gemeldete Nachricht: Bens Antwort im zweiten Briefwechsel.
  const reportedMessage = messages.find(
    (message) =>
      message.conversationId === conversationTwo.id &&
      message.senderId === ben.id,
  );

  if (!reportedMessage) {
    throw new Error("Seed inkonsistent: gemeldete Nachricht nicht gefunden.");
  }

  await db.insert(schema.reports).values({
    reporterId: anna.id,
    targetType: "message",
    targetId: reportedMessage.id,
    conversationId: conversationTwo.id,
    reason: "sonstiges",
    status: "pending",
    createdAt: minutesAgo(300),
  });

  await db.insert(schema.blocks).values({
    blockerId: anna.id,
    blockedId: dario.id,
    createdAt: minutesAgo(200),
  });

  await db.insert(schema.notifications).values({
    recipientId: eva.id,
    conversationId: conversationOne.id,
    type: "new_response",
    createdAt: minutesAgo(470),
  });

  await db.insert(schema.safetyChecks).values([
    {
      targetType: "letter",
      targetId: letters[2].id,
      senderId: eva.id,
      contentSnapshot: "Dritter Platzhaltertext für einen wartenden Brief.",
      riskLevel: "GREEN",
      detectedCategories: [],
      shouldHold: false,
      reasoning: "Keine Auffälligkeiten im Platzhaltertext gefunden.",
      moderationStatus: "resolved",
      actions: [],
      createdAt: minutesAgo(200),
    },
    {
      targetType: "letter",
      targetId: letters[7].id,
      senderId: ben.id,
      contentSnapshot: "Platzhaltertext für einen zurückgehaltenen Brief.",
      riskLevel: "RED",
      detectedCategories: ["testkategorie"],
      shouldHold: true,
      reasoning: "Testfall für einen zurückgehaltenen Beitrag.",
      moderationStatus: "open",
      actions: [{ type: "hold", by: "system" }],
      createdAt: minutesAgo(100),
    },
  ]);

  return {
    users: { anna, ben, clara, dario, eva },
    letters,
    conversations: [conversationOne, conversationTwo],
  };
}

async function main() {
  const { config } = await import("dotenv");
  config();

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Der Seed leert alle Tabellen und laeuft deshalb nicht gegen production.",
    );
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL fehlt. Der Seed laeuft als Eigentuemer.");
  }

  const pool = new Pool({ connectionString: url });

  try {
    const db = drizzle(pool, { schema });
    const result = await runSeed(db);
    console.log(
      `Seed fertig: ${Object.keys(result.users).length} Nutzer, ${result.letters.length} Briefe, ${result.conversations.length} Briefwechsel.`,
    );
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
