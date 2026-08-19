-- Widerspruch gegen eine Moderationsentscheidung.
--
-- Der Digital Services Act verlangt in Art. 20 ein internes Beschwerdeverfahren
-- gegen Entscheidungen, die Inhalte entfernen oder Konten sperren. Ohne eigene
-- Tabelle liesse sich weder festhalten, wogegen jemand Widerspruch einlegt,
-- noch was daraufhin entschieden wurde.
--
-- Rein additiv: die Tabelle zeigt auf users und traegt sonst nur eine
-- Zieltyp-Kennung. Bestehende Beziehungen bleiben unberuehrt.

CREATE TYPE appeal_target AS ENUM ('letter', 'message', 'account');
CREATE TYPE appeal_status AS ENUM ('open', 'upheld', 'rejected');

CREATE TABLE appeals (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  appellant_id    uuid          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_type     appeal_target NOT NULL,
  -- NULL bei einem Widerspruch gegen die Kontosperre: dort ist das Ziel das
  -- Konto selbst, und das steht schon in appellant_id.
  target_id       uuid,
  message         text          NOT NULL,
  status          appeal_status NOT NULL DEFAULT 'open',
  decision_note   text,
  reviewed_by     uuid          REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  created_at      timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT appeals_message_not_empty CHECK (char_length(btrim(message)) > 0)
);

-- Ein Widerspruch je Person und Ziel. Ein zweiter Anlauf zum selben Inhalt
-- waere keine neue Beschwerde, sondern eine Wiederholung.
CREATE UNIQUE INDEX appeals_appellant_target_key
  ON appeals (appellant_id, target_type, target_id);

CREATE INDEX appeals_status_created_at_idx ON appeals (status, created_at);

ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;

-- Der Widersprechende sieht seinen eigenen Vorgang, die Moderation alle.
CREATE POLICY appeals_select ON appeals
  FOR SELECT USING (
    app.is_moderator() OR appellant_id = app.current_user_id()
  );

-- Einlegen nur im eigenen Namen.
CREATE POLICY appeals_insert_own ON appeals
  FOR INSERT WITH CHECK (appellant_id = app.current_user_id());

-- Entscheiden ausschliesslich die Moderation.
CREATE POLICY appeals_update_moderator ON appeals
  FOR UPDATE USING (app.is_moderator())
  WITH CHECK (app.is_moderator());

GRANT SELECT, INSERT ON appeals TO anomail_app;
GRANT UPDATE ON appeals TO anomail_app;

COMMENT ON TABLE appeals IS
  'Internes Beschwerdeverfahren nach DSA Art. 20.';
