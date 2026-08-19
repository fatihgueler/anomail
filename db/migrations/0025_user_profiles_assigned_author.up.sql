-- Erweitert user_profiles um genau eine Beziehung: den Verfasser eines Briefs,
-- der mir gerade zugewiesen ist.
--
-- Warum das noetig ist:
--
-- Die Zuhoeren-Seite zeigt die Anomail-ID des Verfassers. Zum Zeitpunkt der
-- Zuweisung gibt es aber noch keinen Briefwechsel, und die bisherige Sicht
-- zeigt fremde Zeilen nur Gespraechspartnern und der Moderation. Der
-- Antwortende koennte die Kennung also nicht lesen.
--
-- Die neue Bedingung ist bewusst eng: sie gilt nur, solange die Zuweisung
-- laeuft, und nur fuer genau den Verfasser des zugewiesenen Briefs. Sobald die
-- Antwort geschrieben ist, traegt ohnehin die Gespraechs-Bedingung. Laeuft die
-- Zuweisung ab, faellt der Zugriff von selbst wieder weg.
--
-- Weiterhin ohne E-Mail-Spalte und weiterhin mit Eigentuemerfilter im WHERE.
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
  )
  OR EXISTS (
    SELECT 1
    FROM letters l
    WHERE l.author_id = u.id
      AND l.responder_id = app.current_user_id()
      AND l.status = 'in_progress'
      AND l.assigned_at > now() - interval '10 minutes'
  );

COMMENT ON VIEW user_profiles IS
  'Anzeigename fremder Nutzer. Keine E-Mail-Spalte. Sichtbar: eigene Zeile, Gespraechspartner, Verfasser eines gerade zugewiesenen Briefs, und fuer die Moderation alle.';
