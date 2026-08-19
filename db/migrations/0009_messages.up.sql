-- Die Teilnehmer haengen ausschliesslich an der Conversation.
-- Die vier Teilnehmerfelder des Altsystems entfallen ersatzlos.
CREATE TABLE messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  sender_id       uuid        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  content         text        NOT NULL,
  is_original     boolean     NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  hidden_at       timestamptz,
  hidden_reason   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN messages.is_original IS
  'Die erste Nachricht ist eine Kopie des urspruenglichen Briefs.';

CREATE INDEX messages_conversation_id_created_at_idx
  ON messages (conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE ON messages TO anomail_app;
