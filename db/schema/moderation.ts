import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { conversations } from "./conversations";
import {
  moderationStatus,
  notificationType,
  reportReason,
  reportStatus,
  riskLevel,
  targetType,
} from "./enums";
import { users } from "./users";

/**
 * Meldungen durch Nutzer.
 *
 * resolution_note, resolved_by und resolved_at sind gegenueber dem Altsystem
 * neu. Der Digital Services Act verlangt eine Begruendung bei Entfernung
 * (Art. 17) und ein internes Beschwerdeverfahren (Art. 20). Ohne diese Felder
 * laesst sich beides spaeter nicht nachruesten.
 */
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    targetType: targetType("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    reason: reportReason("reason").notNull(),
    status: reportStatus("status").notNull().default("pending"),
    resolutionNote: text("resolution_note"),
    resolvedBy: uuid("resolved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reports_status_created_at_idx").on(table.status, table.createdAt),
  ],
);

/** Blockierung. Wirkt in der Zuweisung in beide Richtungen. */
export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedId] }),
    index("blocks_blocked_id_idx").on(table.blockedId),
    check("blocks_no_self_block", sql`${table.blockerId} <> ${table.blockedId}`),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notifications_recipient_id_read_at_idx").on(
      table.recipientId,
      table.readAt,
    ),
  ],
);

/**
 * Ergebnis einer inhaltlichen Pruefung.
 * target_id ist bewusst nullable: die Pruefung laeuft, bevor der Inhalt
 * gespeichert ist, und wird nachtraeglich verknuepft.
 */
export const safetyChecks = pgTable(
  "safety_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: targetType("target_type").notNull(),
    targetId: uuid("target_id"),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    contentSnapshot: text("content_snapshot").notNull(),
    riskLevel: riskLevel("risk_level").notNull(),
    detectedCategories: text("detected_categories")
      .array()
      .notNull()
      .default([]),
    shouldHold: boolean("should_hold").notNull().default(false),
    reasoning: text("reasoning").notNull(),
    moderationStatus: moderationStatus("moderation_status")
      .notNull()
      .default("open"),
    actions: jsonb("actions").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("safety_checks_moderation_status_created_at_idx").on(
      table.moderationStatus,
      table.createdAt,
    ),
  ],
);

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type Block = typeof blocks.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type SafetyCheck = typeof safetyChecks.$inferSelect;
export type NewSafetyCheck = typeof safetyChecks.$inferInsert;
