CREATE TABLE safety_checks (
  id                  uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type         target_type       NOT NULL,
  target_id           uuid,
  sender_id           uuid              NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  content_snapshot    text              NOT NULL,
  risk_level          risk_level        NOT NULL,
  detected_categories text[]            NOT NULL DEFAULT '{}',
  should_hold         boolean           NOT NULL DEFAULT false,
  reasoning           text              NOT NULL,
  moderation_status   moderation_status NOT NULL DEFAULT 'open',
  actions             jsonb             NOT NULL DEFAULT '[]'::jsonb,
  created_at          timestamptz       NOT NULL DEFAULT now()
);

COMMENT ON COLUMN safety_checks.target_id IS
  'Nullable: die Pruefung laeuft, bevor der Inhalt gespeichert ist, und wird nachtraeglich verknuepft.';

CREATE INDEX safety_checks_moderation_status_created_at_idx
  ON safety_checks (moderation_status, created_at);

-- Bewusst kein GRANT an anomail_app auf Tabellenebene fuer normale Nutzer:
-- der Zugriff wird zusaetzlich durch eine RLS-Policy auf Moderatoren und
-- Admins eingeschraenkt. Beides zusammen, nicht nur eines von beidem.
GRANT SELECT, INSERT, UPDATE ON safety_checks TO anomail_app;
