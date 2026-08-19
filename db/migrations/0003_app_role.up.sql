-- Die Anwendung verbindet sich ausschliesslich als anomail_app.
--
-- Diese Rolle besitzt keine Tabelle und ist kein Superuser. Beides ist
-- entscheidend: der Eigentuemer einer Tabelle und jeder Superuser umgehen
-- Row Level Security. Wuerde die Anwendung als Eigentuemer verbinden, waeren
-- saemtliche Policies wirkungslos, ohne dass irgendetwas fehlschlaegt.
--
-- Das Passwort wird bewusst nicht hier gesetzt, sondern beim Ausrollen:
--   ALTER ROLE anomail_app WITH PASSWORD '...';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anomail_app') THEN
    CREATE ROLE anomail_app LOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO anomail_app;
GRANT USAGE ON SCHEMA app TO anomail_app;

COMMENT ON ROLE anomail_app IS
  'Anwendungsrolle. Kein Eigentuemer, kein Superuser, damit RLS greift.';
