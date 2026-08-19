import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * Pruefprotokoll und Beschwerdeverfahren.
 *
 * Das Protokoll ist unveraenderlich: die Anwendungsrolle hat ausschliesslich
 * SELECT, und ein Trigger weist UPDATE und DELETE auch fuer den Eigentuemer ab.
 * Siehe db/migrations/0031_moderation_audit_log.up.sql.
 */

export const auditAction = pgEnum("audit_action", [
  "viewed",
  "hidden",
  "unhidden",
  "resolved",
  "dismissed",
  "banned",
  "unbanned",
  "appeal_reviewed",
]);

export const moderationAuditLog = pgTable(
  "moderation_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: auditAction("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("moderation_audit_log_created_at_idx").on(table.createdAt),
    index("moderation_audit_log_actor_idx").on(table.actorId, table.createdAt),
  ],
);

export const appealTarget = pgEnum("appeal_target", [
  "letter",
  "message",
  "account",
]);

export const appealStatus = pgEnum("appeal_status", [
  "open",
  "upheld",
  "rejected",
]);

export const appeals = pgTable(
  "appeals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appellantId: uuid("appellant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: appealTarget("target_type").notNull(),
    targetId: uuid("target_id"),
    message: text("message").notNull(),
    status: appealStatus("status").notNull().default("open"),
    decisionNote: text("decision_note"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("appeals_appellant_target_key").on(
      table.appellantId,
      table.targetType,
      table.targetId,
    ),
    index("appeals_status_created_at_idx").on(table.status, table.createdAt),
    check(
      "appeals_message_not_empty",
      sql`char_length(btrim(${table.message})) > 0`,
    ),
  ],
);

export type AuditEntry = typeof moderationAuditLog.$inferSelect;
export type Appeal = typeof appeals.$inferSelect;
