-- Die einzige erlaubte Sicht auf fremde Nutzerzeilen.
--
-- Zwei Eigenschaften machen sie sicher:
--
-- 1. Es gibt keine email-Spalte. Nicht gefiltert, sondern nicht vorhanden.
--    Eine vergessene Projektion kann hier nichts durchlassen.
-- 2. Die Sicht traegt ihren eigenen Eigentuemerfilter im WHERE. Sie ist damit
--    kein ungefiltertes list() - ein Auflisten aller Nutzer ist nicht moeglich.
--
-- security_invoker = false laesst die Sicht mit den Rechten des Eigentuemers
-- laufen. Nur so kommt sie an die Zeilen der Gespraechspartner heran, die die
-- users-Policy dem Aufrufer selbst verwehrt.
CREATE VIEW user_profiles WITH (security_invoker = false) AS
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

GRANT SELECT ON user_profiles TO anomail_app;
