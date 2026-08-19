-- Moderationsaktionen.
--
-- Warum SECURITY DEFINER und nicht erweiterte Policies:
--
--   messages_update_own              erlaubt nur dem Absender das Aendern
--   conversations_update_participant erlaubt nur den beiden Teilnehmern
--   users                            hat Spaltenrechte ohne banned_at
--
-- Die Policies zu weiten haette der Anwendungsrolle dauerhaft mehr erlaubt,
-- als sie braucht. Die Funktionen hier sind der schmalere Weg: sie pruefen die
-- Rolle selbst, verlangen eine Begruendung und schreiben in einem Zug das
-- Pruefprotokoll. Der Handelnde kommt aus app.current_user_id() und ist nicht
-- als Parameter setzbar.
--
-- Fehlercodes:
--   AN020  keine Moderationsrolle
--   AN021  Begruendung fehlt
--   AN022  Ziel nicht gefunden
--   AN023  unbekannter Zieltyp

/* ------------------------------------------------------------------ */
/* Protokoll                                                           */
/* ------------------------------------------------------------------ */

CREATE FUNCTION app.write_audit(
  p_action      audit_action,
  p_target_type text,
  p_target_id   uuid,
  p_note        text
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO moderation_audit_log (actor_id, action, target_type, target_id, note)
  VALUES (app.current_user_id(), p_action, p_target_type, p_target_id, p_note);
END;
$$;

REVOKE EXECUTE ON FUNCTION app.write_audit(audit_action, text, uuid, text) FROM PUBLIC;

/** Wirft, wenn der Aufrufer keine Moderationsrolle hat. */
CREATE FUNCTION app.require_moderator() RETURNS uuid
  LANGUAGE plpgsql
  STABLE
  SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT app.is_moderator() THEN
    RAISE EXCEPTION 'Keine Moderationsrolle' USING ERRCODE = 'AN020';
  END IF;

  RETURN app.current_user_id();
END;
$$;

REVOKE EXECUTE ON FUNCTION app.require_moderator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.require_moderator() TO anomail_app;

/* ------------------------------------------------------------------ */
/* Lesender Zugriff                                                    */
/* ------------------------------------------------------------------ */

/**
 * Haelt fest, dass ein fremder Inhalt im Klartext angesehen wurde.
 * Wird von der Warteschlange fuer jeden angezeigten Eintrag aufgerufen.
 */
CREATE FUNCTION moderation_record_view(
  p_target_type text,
  p_target_id   uuid
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM app.require_moderator();
  PERFORM app.write_audit('viewed', p_target_type, p_target_id, NULL);
END;
$$;

/* ------------------------------------------------------------------ */
/* Inhalt ausblenden und wieder freigeben                              */
/* ------------------------------------------------------------------ */

/**
 * Blendet einen Inhalt aus.
 *
 * Setzt ausschliesslich hidden_at und hidden_reason - niemals deleted_at.
 * deleted_at gehoert der Nutzerloeschung; die beiden Zustaende auseinander zu
 * halten war einer der Konstruktionsfehler des Altsystems.
 *
 * Die Begruendung ist Pflicht (DSA Art. 17) und wird hier erzwungen, nicht im
 * Formular.
 */
CREATE FUNCTION moderation_hide_content(
  p_target_type text,
  p_target_id   uuid,
  p_reason      text
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
DECLARE
  v_touched integer;
BEGIN
  PERFORM app.require_moderator();

  IF p_reason IS NULL OR char_length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Begruendung fehlt' USING ERRCODE = 'AN021';
  END IF;

  IF p_target_type = 'letter' THEN
    UPDATE letters
       SET status        = 'flagged',
           hidden_at     = now(),
           hidden_reason = btrim(p_reason),
           updated_at    = now()
     WHERE id = p_target_id;
  ELSIF p_target_type = 'message' THEN
    UPDATE messages
       SET hidden_at     = now(),
           hidden_reason = btrim(p_reason)
     WHERE id = p_target_id;
  ELSIF p_target_type = 'conversation' THEN
    UPDATE conversations
       SET status     = 'archived',
           updated_at = now()
     WHERE id = p_target_id;
  ELSE
    RAISE EXCEPTION 'Unbekannter Zieltyp %', p_target_type USING ERRCODE = 'AN023';
  END IF;

  GET DIAGNOSTICS v_touched = ROW_COUNT;

  IF v_touched = 0 THEN
    RAISE EXCEPTION 'Ziel nicht gefunden' USING ERRCODE = 'AN022';
  END IF;

  PERFORM app.write_audit('hidden', p_target_type, p_target_id, btrim(p_reason));
END;
$$;

/** Hebt eine Ausblendung wieder auf. Ebenfalls mit Begruendung. */
CREATE FUNCTION moderation_unhide_content(
  p_target_type text,
  p_target_id   uuid,
  p_reason      text
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
DECLARE
  v_touched integer;
BEGIN
  PERFORM app.require_moderator();

  IF p_reason IS NULL OR char_length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Begruendung fehlt' USING ERRCODE = 'AN021';
  END IF;

  IF p_target_type = 'letter' THEN
    -- Zurueck in den Wartezustand, wenn der Brief noch niemandem zugewiesen
    -- und noch nicht beantwortet ist.
    UPDATE letters
       SET hidden_at     = NULL,
           hidden_reason = NULL,
           status        = CASE
                             WHEN responder_id IS NULL AND answered_at IS NULL
                               THEN 'waiting'::letter_status
                             ELSE status
                           END,
           updated_at    = now()
     WHERE id = p_target_id;
  ELSIF p_target_type = 'message' THEN
    UPDATE messages
       SET hidden_at = NULL, hidden_reason = NULL
     WHERE id = p_target_id;
  ELSIF p_target_type = 'conversation' THEN
    UPDATE conversations
       SET status = 'active', updated_at = now()
     WHERE id = p_target_id;
  ELSE
    RAISE EXCEPTION 'Unbekannter Zieltyp %', p_target_type USING ERRCODE = 'AN023';
  END IF;

  GET DIAGNOSTICS v_touched = ROW_COUNT;

  IF v_touched = 0 THEN
    RAISE EXCEPTION 'Ziel nicht gefunden' USING ERRCODE = 'AN022';
  END IF;

  PERFORM app.write_audit('unhidden', p_target_type, p_target_id, btrim(p_reason));
END;
$$;

/* ------------------------------------------------------------------ */
/* Konto sperren                                                       */
/* ------------------------------------------------------------------ */

/**
 * Sperrt ein Konto oder hebt die Sperre auf.
 *
 * Die Sperre wirkt sofort, weil AP3 Datenbank-Sitzungen verwendet: die
 * Nutzerzeile wird bei jeder Anfrage frisch gelesen.
 */
CREATE FUNCTION moderation_set_ban(
  p_user_id uuid,
  p_banned  boolean,
  p_reason  text
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor   uuid;
  v_touched integer;
BEGIN
  v_actor := app.require_moderator();

  IF p_reason IS NULL OR char_length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Begruendung fehlt' USING ERRCODE = 'AN021';
  END IF;

  IF p_user_id = v_actor THEN
    RAISE EXCEPTION 'Das eigene Konto laesst sich hier nicht sperren'
      USING ERRCODE = 'AN020';
  END IF;

  UPDATE users
     SET banned_at     = CASE WHEN p_banned THEN now() ELSE NULL END,
         banned_reason = CASE WHEN p_banned THEN btrim(p_reason) ELSE NULL END,
         updated_at    = now()
   WHERE id = p_user_id;

  GET DIAGNOSTICS v_touched = ROW_COUNT;

  IF v_touched = 0 THEN
    RAISE EXCEPTION 'Ziel nicht gefunden' USING ERRCODE = 'AN022';
  END IF;

  PERFORM app.write_audit(
    CASE WHEN p_banned THEN 'banned'::audit_action ELSE 'unbanned'::audit_action END,
    'user',
    p_user_id,
    btrim(p_reason)
  );
END;
$$;

/* ------------------------------------------------------------------ */
/* Meldungen und Sicherheitspruefungen                                 */
/* ------------------------------------------------------------------ */

/**
 * Schliesst eine Meldung ab.
 *
 * Die Begruendung landet in resolution_note und wird dem Melder unter
 * /my-reports angezeigt (DSA Art. 16 und 17).
 */
CREATE FUNCTION moderation_resolve_report(
  p_report_id uuid,
  p_note      text
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor   uuid;
  v_touched integer;
BEGIN
  v_actor := app.require_moderator();

  IF p_note IS NULL OR char_length(btrim(p_note)) = 0 THEN
    RAISE EXCEPTION 'Begruendung fehlt' USING ERRCODE = 'AN021';
  END IF;

  UPDATE reports
     SET status          = 'resolved',
         resolution_note = btrim(p_note),
         resolved_by     = v_actor,
         resolved_at     = now()
   WHERE id = p_report_id AND status = 'pending';

  GET DIAGNOSTICS v_touched = ROW_COUNT;

  IF v_touched = 0 THEN
    RAISE EXCEPTION 'Ziel nicht gefunden' USING ERRCODE = 'AN022';
  END IF;

  PERFORM app.write_audit('resolved', 'report', p_report_id, btrim(p_note));
END;
$$;

/**
 * Setzt den Bearbeitungsstand einer Sicherheitspruefung und haengt die Aktion
 * an actions an.
 */
CREATE FUNCTION moderation_update_safety_check(
  p_check_id uuid,
  p_status   moderation_status,
  p_note     text
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor   uuid;
  v_touched integer;
BEGIN
  v_actor := app.require_moderator();

  IF p_note IS NULL OR char_length(btrim(p_note)) = 0 THEN
    RAISE EXCEPTION 'Begruendung fehlt' USING ERRCODE = 'AN021';
  END IF;

  UPDATE safety_checks
     SET moderation_status = p_status,
         actions = actions || jsonb_build_object(
           'status', p_status::text,
           'note',   btrim(p_note),
           'by',     v_actor,
           'at',     now()
         )
   WHERE id = p_check_id;

  GET DIAGNOSTICS v_touched = ROW_COUNT;

  IF v_touched = 0 THEN
    RAISE EXCEPTION 'Ziel nicht gefunden' USING ERRCODE = 'AN022';
  END IF;

  PERFORM app.write_audit(
    CASE WHEN p_status = 'dismissed' THEN 'dismissed'::audit_action
         ELSE 'resolved'::audit_action END,
    'safety_check',
    p_check_id,
    btrim(p_note)
  );
END;
$$;

/* ------------------------------------------------------------------ */
/* Widerspruch                                                         */
/* ------------------------------------------------------------------ */

/** Entscheidet ueber einen Widerspruch. */
CREATE FUNCTION moderation_review_appeal(
  p_appeal_id uuid,
  p_status    appeal_status,
  p_note      text
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor   uuid;
  v_touched integer;
BEGIN
  v_actor := app.require_moderator();

  IF p_note IS NULL OR char_length(btrim(p_note)) = 0 THEN
    RAISE EXCEPTION 'Begruendung fehlt' USING ERRCODE = 'AN021';
  END IF;

  IF p_status = 'open' THEN
    RAISE EXCEPTION 'Ein Widerspruch laesst sich nicht auf offen zuruecksetzen'
      USING ERRCODE = 'AN023';
  END IF;

  UPDATE appeals
     SET status        = p_status,
         decision_note = btrim(p_note),
         reviewed_by   = v_actor,
         reviewed_at   = now()
   WHERE id = p_appeal_id AND status = 'open';

  GET DIAGNOSTICS v_touched = ROW_COUNT;

  IF v_touched = 0 THEN
    RAISE EXCEPTION 'Ziel nicht gefunden' USING ERRCODE = 'AN022';
  END IF;

  PERFORM app.write_audit('appeal_reviewed', 'appeal', p_appeal_id, btrim(p_note));
END;
$$;

/* ------------------------------------------------------------------ */
/* Rechte                                                              */
/* ------------------------------------------------------------------ */

REVOKE EXECUTE ON FUNCTION moderation_record_view(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION moderation_hide_content(text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION moderation_unhide_content(text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION moderation_set_ban(uuid, boolean, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION moderation_resolve_report(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION moderation_update_safety_check(uuid, moderation_status, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION moderation_review_appeal(uuid, appeal_status, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION moderation_record_view(text, uuid) TO anomail_app;
GRANT EXECUTE ON FUNCTION moderation_hide_content(text, uuid, text) TO anomail_app;
GRANT EXECUTE ON FUNCTION moderation_unhide_content(text, uuid, text) TO anomail_app;
GRANT EXECUTE ON FUNCTION moderation_set_ban(uuid, boolean, text) TO anomail_app;
GRANT EXECUTE ON FUNCTION moderation_resolve_report(uuid, text) TO anomail_app;
GRANT EXECUTE ON FUNCTION moderation_update_safety_check(uuid, moderation_status, text) TO anomail_app;
GRANT EXECUTE ON FUNCTION moderation_review_appeal(uuid, appeal_status, text) TO anomail_app;
