-- Briefzuweisung.
--
-- Im Altsystem war der Vorgang dreiteilig: lesen, im Client filtern, dann
-- updaten. Zwischen Lesen und Update lag ein Zeitfenster, in dem ein zweiter
-- Nutzer denselben Brief lesen konnte. Beide bekamen ihn zugewiesen.
--
-- Hier passiert alles in einer Anweisung. FOR UPDATE SKIP LOCKED sperrt die
-- gefundene Zeile und ueberspringt Zeilen, die ein paralleler Aufruf gerade
-- haelt. Zwei gleichzeitige Aufrufe koennen denselben Brief nicht bekommen.
--
-- SECURITY DEFINER ist noetig, weil der Aufrufer zum Zeitpunkt des Updates
-- noch nicht responder_id ist und die letters_update-Policy ihn deshalb
-- abweisen wuerde. Damit die erhoehten Rechte nicht missbraucht werden koennen,
-- prueft die Funktion, dass p_user_id der angemeldete Nutzer ist - sonst
-- koennte A einen Brief auf B zuweisen lassen.
--
-- Rueckgabe: die Briefzeile, oder eine Zeile mit NULL-Feldern, wenn keiner
-- verfuegbar ist. Aufrufkonvention: SELECT * FROM assign_letter($1),
-- danach id IS NULL pruefen. So wird die Funktion genau einmal ausgefuehrt.
CREATE FUNCTION assign_letter(p_user_id uuid) RETURNS letters
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
DECLARE
  v_letter  letters%ROWTYPE;
  v_session uuid := app.current_user_id();
BEGIN
  IF v_session IS NOT NULL AND v_session <> p_user_id THEN
    RAISE EXCEPTION
      'assign_letter: p_user_id (%) weicht vom angemeldeten Nutzer (%) ab',
      p_user_id, v_session
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT l.*
    INTO v_letter
    FROM letters l
   WHERE l.status = 'waiting'
     AND l.author_id <> p_user_id
     AND l.deleted_at IS NULL
     AND l.hidden_at IS NULL
     AND NOT app.is_blocked_between(p_user_id, l.author_id)
   ORDER BY l.created_at ASC
   LIMIT 1
   FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE letters
     SET status       = 'in_progress',
         responder_id = p_user_id,
         assigned_at  = now(),
         updated_at   = now()
   WHERE id = v_letter.id
   RETURNING * INTO v_letter;

  RETURN v_letter;
END;
$$;

COMMENT ON FUNCTION assign_letter(uuid) IS
  'Weist atomar den aeltesten passenden wartenden Brief zu. NULL, wenn keiner verfuegbar ist.';

-- Gibt abgelaufene Zuweisungen zurueck in den Wartezustand.
--
-- Im Altsystem lief diese Rueckgabe im Client und griff nur, wenn zufaellig
-- jemand die Zuhoeren-Seite oeffnete. Briefe konnten dadurch beliebig lange in
-- in_progress haengen. Der Cron-Aufruf entsteht in einem spaeteren Paket.
CREATE FUNCTION release_expired_leases() RETURNS integer
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
  WITH released AS (
    UPDATE letters
       SET status       = 'waiting',
           responder_id = NULL,
           assigned_at  = NULL,
           updated_at   = now()
     WHERE status = 'in_progress'
       AND assigned_at IS NOT NULL
       AND assigned_at < now() - interval '10 minutes'
    RETURNING id
  )
  SELECT count(*)::integer FROM released;
$$;

COMMENT ON FUNCTION release_expired_leases() IS
  'Setzt Zuweisungen aelter als 10 Minuten auf waiting zurueck. Gibt die Anzahl zurueck.';

REVOKE EXECUTE ON FUNCTION assign_letter(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION release_expired_leases() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION assign_letter(uuid) TO anomail_app;
GRANT EXECUTE ON FUNCTION release_expired_leases() TO anomail_app;
