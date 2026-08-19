CREATE TABLE conversations (
  id                 uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  original_letter_id uuid                NOT NULL REFERENCES letters (id) ON DELETE RESTRICT,
  participant_a_id   uuid                NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  participant_b_id   uuid                NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  status             conversation_status NOT NULL DEFAULT 'active',
  created_at         timestamptz         NOT NULL DEFAULT now(),
  updated_at         timestamptz         NOT NULL DEFAULT now()
);

-- Traegt die Teilnehmerpruefung in app.is_conversation_participant().
CREATE INDEX conversations_participant_a_id_idx ON conversations (participant_a_id);
CREATE INDEX conversations_participant_b_id_idx ON conversations (participant_b_id);

GRANT SELECT, INSERT, UPDATE ON conversations TO anomail_app;
