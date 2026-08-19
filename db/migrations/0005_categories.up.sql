-- Kategorien als eigene Tabelle statt als kommaseparierter String.
CREATE TABLE categories (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug  text NOT NULL UNIQUE,
  label text NOT NULL
);

GRANT SELECT ON categories TO anomail_app;
