CREATE TABLE notifications (
  id              uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id    uuid              NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  conversation_id uuid              NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  type            notification_type NOT NULL,
  read_at         timestamptz,
  created_at      timestamptz       NOT NULL DEFAULT now()
);

CREATE INDEX notifications_recipient_id_read_at_idx
  ON notifications (recipient_id, read_at);

-- Kein INSERT fuer die Anwendungsrolle: Benachrichtigungen entstehen durch das
-- System, nicht durch Nutzereingaben. Wer sie schreiben darf, bekommt spaeter
-- eine eigene SECURITY-DEFINER-Funktion statt eines offenen Schreibrechts.
GRANT SELECT, UPDATE ON notifications TO anomail_app;
