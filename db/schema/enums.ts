import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Alle Aufzaehlungen sind echte PostgreSQL-Enums.
 * Freie Textspalten mit Konventionen im Anwendungscode gibt es hier nicht.
 */

export const userRole = pgEnum("user_role", ["user", "moderator", "admin"]);

export const letterStatus = pgEnum("letter_status", [
  "waiting",
  "in_progress",
  "answered",
  "flagged",
]);

export const conversationStatus = pgEnum("conversation_status", [
  "active",
  "archived",
]);

/**
 * Wird von reports.target_type und safety_checks.target_type geteilt.
 * safety_checks braucht denselben Wertebereich, deshalb ein gemeinsamer Typ
 * statt zweier identischer Enums.
 */
export const targetType = pgEnum("target_type", [
  "letter",
  "message",
  "conversation",
]);

export const reportReason = pgEnum("report_reason", [
  "belaestigung",
  "beleidigung",
  "bedrohung",
  "sexuelle_inhalte",
  "persoenliche_daten",
  "spam",
  "gefaehrliche_inhalte",
  "sonstiges",
]);

export const reportStatus = pgEnum("report_status", ["pending", "resolved"]);

export const notificationType = pgEnum("notification_type", ["new_response"]);

export const riskLevel = pgEnum("risk_level", [
  "GREEN",
  "YELLOW",
  "RED",
  "CRISIS",
]);

export const moderationStatus = pgEnum("moderation_status", [
  "open",
  "reviewing",
  "resolved",
  "dismissed",
]);
