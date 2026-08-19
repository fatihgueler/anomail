import { index, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";

import { letters } from "./letters";

/**
 * Kategorien als eigene Tabelle.
 *
 * Im Altsystem war category ein kommaseparierter String in der Brieftabelle.
 * Damit liess sich weder filtern noch indizieren.
 */
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
});

export const letterCategories = pgTable(
  "letter_categories",
  {
    letterId: uuid("letter_id")
      .notNull()
      .references(() => letters.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ columns: [table.letterId, table.categoryId] }),
    index("letter_categories_category_id_idx").on(table.categoryId),
  ],
);

export type Category = typeof categories.$inferSelect;
export type LetterCategory = typeof letterCategories.$inferSelect;
