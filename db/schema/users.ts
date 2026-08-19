import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { userRole } from "./enums";

/** Alphabet der Anomail-ID: ohne I, O, 0 und 1, um Verwechslungen auszuschliessen. */
export const ANOMAIL_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Die einzige interne Identitaet.
 *
 * users.id ist ueberall sonst der einzige Fremdschluessel. anomail_id ist
 * reiner Anzeigename und wird nie referenziert - im Altsystem liefen beide
 * Identitaeten parallel und erzeugten Zuordnungsfehler bei jeder Verknuepfung.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    anomailId: text("anomail_id").notNull().unique(),
    role: userRole("role").notNull().default("user"),
    /** Zeitpunkt der Bestaetigung per Magic-Link. NULL, solange unbestaetigt. */
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    /** Nutzerpraeferenz. Ist sie aus, entsteht keine Benachrichtigung. */
    notificationsEnabled: boolean("notifications_enabled")
      .notNull()
      .default(true),
    bannedAt: timestamp("banned_at", { withTimezone: true }),
    bannedReason: text("banned_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "users_anomail_id_format",
      sql`${table.anomailId} ~ '^AN-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$'`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
