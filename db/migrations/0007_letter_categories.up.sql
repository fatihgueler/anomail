CREATE TABLE letter_categories (
  letter_id   uuid NOT NULL REFERENCES letters (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  PRIMARY KEY (letter_id, category_id)
);

-- Der zusammengesetzte Primaerschluessel deckt nur letter_id als fuehrende
-- Spalte ab. Fuer die Suche nach Kategorie braucht es einen eigenen Index.
CREATE INDEX letter_categories_category_id_idx ON letter_categories (category_id);

GRANT SELECT, INSERT, DELETE ON letter_categories TO anomail_app;
