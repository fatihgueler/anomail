-- Zurueck auf die Fassung aus Migration 0016: ohne die Bedingung fuer den
-- Verfasser eines zugewiesenen Briefs.
CREATE OR REPLACE VIEW user_profiles WITH (security_invoker = false) AS
SELECT
  u.id,
  u.anomail_id,
  u.created_at
FROM users u
WHERE
  u.id = app.current_user_id()
  OR app.is_moderator()
  OR EXISTS (
    SELECT 1
    FROM conversations c
    WHERE (c.participant_a_id = app.current_user_id() AND c.participant_b_id = u.id)
       OR (c.participant_b_id = app.current_user_id() AND c.participant_a_id = u.id)
  );

COMMENT ON VIEW user_profiles IS
  'Anzeigename fremder Nutzer. Enthaelt keine E-Mail-Spalte und filtert auf eigene Gespraechspartner.';
