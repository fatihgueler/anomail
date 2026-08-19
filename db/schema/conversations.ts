import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { conversationStatus } from "./enums";
import { letters } from "./letters";
import { users } from "./users";

/** Der private Briefwechsel zwischen genau zwei Personen. */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    originalLetterId: uuid("original_letter_id")
      .notNull()
      .references(() => letters.id, { onDelete: "restrict" }),
    participantAId: uuid("participant_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    participantBId: uuid("participant_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: conversationStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Traegt die Teilnehmerpruefung in app.is_conversation_participant(),
    // die bei jedem Lesen einer Nachricht ausgewertet wird.
    index("conversations_participant_a_id_idx").on(table.participantAId),
    index("conversations_participant_b_id_idx").on(table.participantBId),
  ],
);

/**
 * Eine Nachricht im Briefwechsel.
 *
 * Die Teilnehmer haengen ausschliesslich an der Conversation. Im Altsystem trug
 * jede Message vier zusaetzliche Teilnehmerfelder - Redundanz ohne Nutzen, mit
 * dem Risiko, dass Message und Conversation auseinanderlaufen.
 */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    content: text("content").notNull(),
    /** Die erste Nachricht ist eine Kopie des urspruenglichen Briefs. */
    isOriginal: boolean("is_original").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    hiddenReason: text("hidden_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_conversation_id_created_at_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
