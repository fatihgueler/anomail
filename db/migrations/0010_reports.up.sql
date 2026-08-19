CREATE TABLE reports (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     uuid          NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  target_type     target_type   NOT NULL,
  target_id       uuid          NOT NULL,
  conversation_id uuid          REFERENCES conversations (id) ON DELETE SET NULL,
  reason          report_reason NOT NULL,
  status          report_status NOT NULL DEFAULT 'pending',
  resolution_note text,
  resolved_by     uuid          REFERENCES users (id) ON DELETE SET NULL,
  resolved_at     timestamptz,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- DSA Art. 17 verlangt eine Begruendung bei Entfernung, Art. 20 ein internes
-- Beschwerdeverfahren. Beides braucht diese drei Spalten.
COMMENT ON COLUMN reports.resolution_note IS 'Begruendungspflicht nach DSA Art. 17.';
COMMENT ON COLUMN reports.resolved_by IS 'Bearbeitende Person, fuer DSA Art. 20.';
COMMENT ON COLUMN reports.resolved_at IS 'Zeitpunkt der Entscheidung, fuer DSA Art. 20.';

CREATE INDEX reports_status_created_at_idx ON reports (status, created_at);

GRANT SELECT, INSERT ON reports TO anomail_app;
GRANT UPDATE ON reports TO anomail_app;
