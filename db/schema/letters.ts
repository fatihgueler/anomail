import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { letterStatus } from "./enums";
import { users } from "./users";

/**
 * Ein Brief.
 *
 * Zwei Trennungen sind hier wesentlich:
 *
 * deleted_at  - Loeschung durch den Nutzer selbst.
 * hidden_at   - Sperre durch die Moderation, mit Begruendung.
 *
 * Im Altsystem lief beides ueber deleted_at. Damit liessen sich Nutzerloeschung
 * und Moderationssperre nicht auseinanderhalten, weder fachlich noch rechtlich.
 *
 * assigned_at ist die Basis fuer die 10-Minuten-Lease der Zuweisung.
 */
export const letters = pgTable(
  "letters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    content: text("content").notNull(),
    status: letterStatus("status").notNull().default("waiting"),
    responderId: uuid("responder_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    hiddenReason: text("hidden_reason"),
    /** Kennung des Absendevorgangs. Verhindert einen zweiten Brief bei Doppelabsenden. */
    submissionId: uuid("submission_id").unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Traegt die Zuweisungsabfrage: waiting-Briefe, aelteste zuerst.
    index("letters_status_created_at_idx").on(table.status, table.createdAt),
    index("letters_author_id_idx").on(table.authorId),
    index("letters_responder_id_idx").on(table.responderId),
  ],
);

export type Letter = typeof letters.$inferSelect;
export type NewLetter = typeof letters.$inferInsert;
