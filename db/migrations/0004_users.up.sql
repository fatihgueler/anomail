-- users.id ist die einzige interne Identitaet und ueberall sonst der einzige
-- Fremdschluessel. anomail_id ist reiner Anzeigename und wird nie referenziert.
CREATE TABLE users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text        NOT NULL UNIQUE,
  anomail_id    text        NOT NULL UNIQUE,
  role          user_role   NOT NULL DEFAULT 'user',
  banned_at     timestamptz,
  banned_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- Alphabet ohne I, O, 0 und 1.
  CONSTRAINT users_anomail_id_format CHECK (
    anomail_id ~ '^AN-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$'
  )
);

COMMENT ON COLUMN users.anomail_id IS
  'Reiner Anzeigename. Niemals als Fremdschluessel verwenden.';

GRANT SELECT, INSERT ON users TO anomail_app;

-- UPDATE bewusst nur auf diesen Spalten. Haette die Anwendungsrolle das Recht,
-- role oder banned_at zu schreiben, koennte sich jeder Nutzer ueber seine
-- eigene Zeile selbst zum Admin machen - die users_update_self-Policy erlaubt
-- ja genau diese Zeile. Rollen- und Sperrverwaltung bekommt spaeter einen
-- eigenen, gepruefen Weg.
GRANT UPDATE (email, updated_at) ON users TO anomail_app;
