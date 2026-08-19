CREATE TABLE letters (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     uuid          NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  content       text          NOT NULL,
  status        letter_status NOT NULL DEFAULT 'waiting',
  responder_id  uuid          REFERENCES users (id) ON DELETE SET NULL,
  assigned_at   timestamptz,
  answered_at   timestamptz,
  deleted_at    timestamptz,
  hidden_at     timestamptz,
  hidden_reason text,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON COLUMN letters.deleted_at IS
  'Loeschung durch den Nutzer. Getrennt von hidden_at.';
COMMENT ON COLUMN letters.hidden_at IS
  'Sperre durch die Moderation. Getrennt von deleted_at.';
COMMENT ON COLUMN letters.assigned_at IS
  'Beginn der 10-Minuten-Lease. Basis fuer release_expired_leases().';

-- Traegt die Zuweisungsabfrage: wartende Briefe, aelteste zuerst.
CREATE INDEX letters_status_created_at_idx ON letters (status, created_at);
CREATE INDEX letters_author_id_idx ON letters (author_id);
CREATE INDEX letters_responder_id_idx ON letters (responder_id);

GRANT SELECT, INSERT, UPDATE ON letters TO anomail_app;
