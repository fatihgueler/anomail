-- Weiterschreiben im Briefwechsel.
--
-- Wie in AP5 braucht es SECURITY DEFINER, weil der Vorgang Tabellen beruehrt,
-- die der Anwendungsrolle verschlossen sind:
--   safety_checks  - der Moderation vorbehalten
--   notifications  - hat fuer anomail_app gar kein INSERT-Recht
--
-- Die einzige ID aus dem Request ist p_conversation_id. Sie wird gegen die
-- Teilnehmerschaft geprueft, bevor irgendetwas geschrieben wird; der Absender
-- kommt aus app.current_user_id() und ist nicht setzbar.
--
-- Fehlercodes:
--   AN010  kein Teilnehmer dieses Briefwechsels
--   AN011  Briefwechsel ist archiviert
--   AN012  Laenge ausserhalb der Grenzen
--   AN013  Konto gesperrt
CREATE FUNCTION post_message(
  p_conversation_id     uuid,
  p_content             text,
  p_risk_level          risk_level,
  p_should_hold         boolean,
  p_detected_categories text[],
  p_reasoning           text,
  p_content_snapshot    text
) RETURNS TABLE (message_id uuid, held boolean)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
DECLARE
  v_sender       uuid := app.current_user_id();
  v_banned       timestamptz;
  v_conversation conversations%ROWTYPE;
  v_recipient    uuid;
  v_hold         boolean;
  v_message      uuid;
BEGIN
  IF v_sender IS NULL THEN
    RAISE EXCEPTION 'post_message ohne angemeldeten Nutzer'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT banned_at INTO v_banned FROM users WHERE id = v_sender;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'post_message: Nutzer % existiert nicht', v_sender
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_banned IS NOT NULL THEN
    RAISE EXCEPTION 'Konto ist gesperrt' USING ERRCODE = 'AN013';
  END IF;

  -- Sperrt den Briefwechsel bis zum Ende der Transaktion. Ohne das koennte
  -- zwischen Pruefung und Einfuegen jemand archivieren.
  SELECT * INTO v_conversation
    FROM conversations
   WHERE id = p_conversation_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Briefwechsel nicht gefunden' USING ERRCODE = 'AN010';
  END IF;

  IF v_sender NOT IN (v_conversation.participant_a_id, v_conversation.participant_b_id) THEN
    RAISE EXCEPTION 'Kein Teilnehmer dieses Briefwechsels' USING ERRCODE = 'AN010';
  END IF;

  IF v_conversation.status <> 'active' THEN
    RAISE EXCEPTION 'Briefwechsel ist archiviert' USING ERRCODE = 'AN011';
  END IF;

  IF char_length(p_content) < 1 OR char_length(p_content) > 4000 THEN
    RAISE EXCEPTION 'Laenge % ausserhalb von 1..4000', char_length(p_content)
      USING ERRCODE = 'AN012';
  END IF;

  v_hold := COALESCE(p_should_hold, true) OR p_risk_level = 'CRISIS';

  -- Zurueckgehalten wird ueber hidden_at, niemals ueber deleted_at: das eine
  -- ist eine Moderationssperre, das andere eine Loeschung durch den Nutzer.
  INSERT INTO messages (
    conversation_id, sender_id, content, is_original, hidden_at, hidden_reason
  ) VALUES (
    p_conversation_id,
    v_sender,
    p_content,
    false,
    CASE WHEN v_hold THEN now() ELSE NULL END,
    CASE WHEN v_hold THEN 'Automatisch zurueckgehalten, wartet auf Sichtung durch die Moderation.' ELSE NULL END
  )
  RETURNING id INTO v_message;

  UPDATE conversations SET updated_at = now() WHERE id = p_conversation_id;

  INSERT INTO safety_checks (
    target_type, target_id, sender_id, content_snapshot,
    risk_level, detected_categories, should_hold, reasoning,
    moderation_status, actions
  ) VALUES (
    'message',
    v_message,
    v_sender,
    p_content_snapshot,
    p_risk_level,
    COALESCE(p_detected_categories, '{}'),
    v_hold,
    p_reasoning,
    (CASE WHEN v_hold THEN 'open' ELSE 'resolved' END)::moderation_status,
    '[]'::jsonb
  );

  -- Benachrichtigung nur, wenn es auch etwas zu sehen gibt. Bei einer
  -- zurueckgehaltenen Nachricht zeigte sie ins Leere.
  IF NOT v_hold THEN
    v_recipient := CASE
      WHEN v_conversation.participant_a_id = v_sender
        THEN v_conversation.participant_b_id
      ELSE v_conversation.participant_a_id
    END;

    INSERT INTO notifications (recipient_id, conversation_id, type)
    VALUES (v_recipient, p_conversation_id, 'new_response');
  END IF;

  message_id := v_message;
  held       := v_hold;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION post_message(uuid, text, risk_level, boolean, text[], text, text) IS
  'Nachricht, Pruefprotokoll und Benachrichtigung atomar. Absender kommt aus app.current_user_id().';

REVOKE EXECUTE ON FUNCTION post_message(uuid, text, risk_level, boolean, text[], text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION post_message(uuid, text, risk_level, boolean, text[], text, text) TO anomail_app;
