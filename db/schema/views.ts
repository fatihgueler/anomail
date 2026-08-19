import { pgView, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Die einzige erlaubte Sicht auf fremde Nutzerzeilen.
 *
 * Enthaelt keine E-Mail-Spalte - nicht gefiltert, sondern gar nicht vorhanden.
 * Die Sicht traegt ihren eigenen Eigentuemerfilter: sie zeigt die eigene Zeile,
 * die Zeilen der eigenen Gespraechspartner und fuer Moderatoren alle. Ein
 * ungefiltertes Auflisten aller Nutzer ist darueber nicht moeglich.
 *
 * Definiert in db/migrations/0016_user_profiles_view.up.sql.
 */
export const userProfiles = pgView("user_profiles", {
  id: uuid("id").notNull(),
  anomailId: text("anomail_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}).existing();
