-- Additiv: eine Spalte mit Vorgabewert, keine Aenderung an bestehenden Daten.
--
-- Der Schalter unter /settings braucht einen Ort. Vorgabe ist eingeschaltet:
-- wer bisher Benachrichtigungen bekam, bekommt sie weiter.
ALTER TABLE users
  ADD COLUMN notifications_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN users.notifications_enabled IS
  'Nutzerpraeferenz. Ist sie aus, entsteht beim Eintreffen einer Antwort keine Benachrichtigung.';

-- Ohne dieses Recht koennte die Anwendungsrolle die Spalte nicht schreiben:
-- Migration 0004 hat UPDATE auf users bewusst auf einzelne Spalten begrenzt,
-- damit sich niemand ueber die eigene Zeile zum Admin machen kann.
GRANT UPDATE (notifications_enabled) ON users TO anomail_app;
