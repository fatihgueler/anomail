-- Hilfsfunktionen der Zugriffskontrolle.
--
-- Warum SECURITY DEFINER:
--
-- Eine Policy muss Regeln ueber Zeilen auswerten, die der anfragende Nutzer
-- selbst nicht sehen darf. Beispiel: die Policy auf letters muss pruefen, ob
-- eine Blockierung in IRGENDEINER Richtung besteht. Die Policy auf blocks
-- laesst den Nutzer aber nur seine eigenen Blockierungen sehen. Wuerde die
-- Unterabfrage als anfragender Nutzer laufen, kaeme fuer die Gegenrichtung
-- schlicht "keine Blockierung" heraus - die Policy wuerde still zu wenig
-- durchsetzen, ohne Fehlermeldung.
--
-- SECURITY DEFINER laesst diese Funktionen als Eigentuemer laufen. Der
-- Eigentuemer ist von RLS ausgenommen, solange die Tabellen mit ENABLE (nicht
-- FORCE) ROW LEVEL SECURITY arbeiten. Genau daraus folgt auch, dass die
-- Anwendung sich niemals als Eigentuemer verbinden darf - siehe Migration 0003.
--
-- search_path ist bei jeder SECURITY-DEFINER-Funktion fest gesetzt, damit sie
-- nicht ueber einen manipulierten Suchpfad auf untergeschobene Objekte zeigt.

CREATE FUNCTION app.current_user_id() RETURNS uuid
  LANGUAGE sql
  STABLE
  SET search_path = pg_catalog
AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '')::uuid;
$$;

COMMENT ON FUNCTION app.current_user_id() IS
  'Der angemeldete Nutzer aus der Session-Variable. NULL, wenn nicht gesetzt.';

CREATE FUNCTION app.is_moderator() RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = app.current_user_id()
      AND u.role IN ('moderator', 'admin')
      AND u.banned_at IS NULL
  );
$$;

COMMENT ON FUNCTION app.is_moderator() IS
  'Wahr fuer nicht gesperrte Moderatoren und Admins. Gesperrte Konten verlieren die Rechte sofort.';

CREATE FUNCTION app.is_blocked_between(p_first uuid, p_second uuid) RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocks b
    WHERE (b.blocker_id = p_first  AND b.blocked_id = p_second)
       OR (b.blocker_id = p_second AND b.blocked_id = p_first)
  );
$$;

COMMENT ON FUNCTION app.is_blocked_between(uuid, uuid) IS
  'Blockierung in einer der beiden Richtungen. Bewusst richtungsunabhaengig.';

CREATE FUNCTION app.is_conversation_participant(p_conversation_id uuid) RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = p_conversation_id
      AND app.current_user_id() IN (c.participant_a_id, c.participant_b_id)
  );
$$;

COMMENT ON FUNCTION app.is_conversation_participant(uuid) IS
  'Wahr, wenn der angemeldete Nutzer einer der beiden Teilnehmer ist.';

-- SECURITY-DEFINER-Funktionen bekommen kein Ausfuehrungsrecht fuer alle.
REVOKE EXECUTE ON FUNCTION app.is_moderator() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app.is_blocked_between(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app.is_conversation_participant(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app.current_user_id() TO anomail_app;
GRANT EXECUTE ON FUNCTION app.is_moderator() TO anomail_app;
GRANT EXECUTE ON FUNCTION app.is_blocked_between(uuid, uuid) TO anomail_app;
GRANT EXECUTE ON FUNCTION app.is_conversation_participant(uuid) TO anomail_app;
