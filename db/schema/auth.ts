import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * Tabellen fuer Auth.js und die Anmeldung.
 *
 * Keine dieser Tabellen hat Rechte fuer anomail_app. Sie sind ausschliesslich
 * ueber withServiceRole erreichbar, weil es waehrend der Anmeldung noch keinen
 * Nutzerkontext gibt, gegen den eine Policy pruefen koennte.
 */

/** Datenbank-Sitzungen. Kein JWT, damit eine Sperre sofort wirkt. */
export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_idx").on(table.expires),
  ],
);

/** Von Auth.js vorgesehen. Bleibt leer, solange es kein OAuth gibt. */
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

/** Einmal-Token der Magic-Links. */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
    index("verification_tokens_expires_idx").on(table.expires),
  ],
);

/**
 * Kennungen, die nie erneut vergeben werden.
 * Begruendung der Bauweise steht in db/migrations/0020_retired_anomail_ids.up.sql.
 */
export const retiredAnomailIds = pgTable(
  "retired_anomail_ids",
  {
    anomailId: text("anomail_id").primaryKey(),
    retiredAt: timestamp("retired_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "retired_anomail_ids_format",
      sql`${table.anomailId} ~ '^AN-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$'`,
    ),
  ],
);

export const rateLimitScope = pgEnum("rate_limit_scope", ["email", "ip"]);

/** Ereignisse der Ratenbegrenzung. Bezeichner nur als HMAC, nie im Klartext. */
export const authRateLimitEvents = pgTable(
  "auth_rate_limit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scope: rateLimitScope("scope").notNull(),
    identifierHash: text("identifier_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("auth_rate_limit_events_lookup_idx").on(
      table.scope,
      table.identifierHash,
      table.createdAt,
    ),
    index("auth_rate_limit_events_created_at_idx").on(table.createdAt),
  ],
);

export type Session = typeof sessions.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type RetiredAnomailId = typeof retiredAnomailIds.$inferSelect;
