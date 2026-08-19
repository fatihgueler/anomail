-- DROP OWNED BY entfernt alle der Rolle erteilten Rechte in dieser Datenbank.
-- Ohne diesen Schritt scheitert DROP ROLE an haengenden Abhaengigkeiten.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anomail_app') THEN
    EXECUTE 'DROP OWNED BY anomail_app';
    EXECUTE 'DROP ROLE anomail_app';
  END IF;
END
$$;
