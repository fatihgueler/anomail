-- Zurueck auf die Fassungen aus Migration 0027 und 0024: ohne Blockpruefung
-- beim Weiterschreiben und ohne Beachtung der Benachrichtigungspraeferenz.

CREATE OR REPLACE FUNCTION post_message(
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

  INSERT INTO messages (
    conversation_id, sender_id, content, is_original, hidden_at, hidden_reason
  ) VALUES (
    p_conversation_id, v_sender, p_content, false,
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
    'message', v_message, v_sender, p_content_snapshot, p_risk_level,
    COALESCE(p_detected_categories, '{}'), v_hold, p_reasoning,
    (CASE WHEN v_hold THEN 'open' ELSE 'resolved' END)::moderation_status,
    '[]'::jsonb
  );

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

CREATE OR REPLACE FUNCTION reply_to_letter(
  p_letter_id           uuid,
  p_content             text,
  p_risk_level          risk_level,
  p_should_hold         boolean,
  p_detected_categories text[],
  p_reasoning           text,
  p_content_snapshot    text
) RETURNS TABLE (conversation_id uuid, message_id uuid, held boolean)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
DECLARE
  v_responder      uuid := app.current_user_id();
  v_banned         timestamptz;
  v_letter         letters%ROWTYPE;
  v_conversation   uuid;
  v_message        uuid;
  v_hold           boolean;
  v_has_original   boolean;
BEGIN
  IF v_responder IS NULL THEN
    RAISE EXCEPTION 'reply_to_letter ohne angemeldeten Nutzer'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT banned_at INTO v_banned FROM users WHERE id = v_responder;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reply_to_letter: Nutzer % existiert nicht', v_responder
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_banned IS NOT NULL THEN
    RAISE EXCEPTION 'Konto ist gesperrt' USING ERRCODE = 'AN004';
  END IF;

  SELECT * INTO v_letter FROM letters WHERE id = p_letter_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Brief nicht gefunden' USING ERRCODE = 'AN001';
  END IF;

  IF v_letter.status = 'answered' THEN
    RAISE EXCEPTION 'Brief ist bereits beantwortet' USING ERRCODE = 'AN003';
  END IF;

  IF v_letter.responder_id IS DISTINCT FROM v_responder THEN
    RAISE EXCEPTION 'Brief ist nicht mehr dir zugewiesen' USING ERRCODE = 'AN002';
  END IF;

  IF v_letter.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Brief ist dir nicht zugewiesen' USING ERRCODE = 'AN001';
  END IF;

  IF v_letter.assigned_at IS NULL
     OR v_letter.assigned_at < now() - interval '10 minutes' THEN
    RAISE EXCEPTION 'Zuweisung ist abgelaufen' USING ERRCODE = 'AN002';
  END IF;

  IF char_length(p_content) < 80 OR char_length(p_content) > 4000 THEN
    RAISE EXCEPTION 'Laenge % ausserhalb von 80..4000', char_length(p_content)
      USING ERRCODE = 'AN005';
  END IF;

  v_hold := COALESCE(p_should_hold, true) OR p_risk_level = 'CRISIS';

  SELECT c.id INTO v_conversation
    FROM conversations c
   WHERE c.original_letter_id = v_letter.id
   LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO conversations (original_letter_id, participant_a_id, participant_b_id)
    VALUES (v_letter.id, v_letter.author_id, v_responder)
    RETURNING id INTO v_conversation;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM messages m
     WHERE m.conversation_id = v_conversation AND m.is_original
  ) INTO v_has_original;

  IF NOT v_has_original THEN
    INSERT INTO messages (conversation_id, sender_id, content, is_original, created_at)
    VALUES (v_conversation, v_letter.author_id, v_letter.content, true, v_letter.created_at);
  END IF;

  INSERT INTO messages (
    conversation_id, sender_id, content, is_original, hidden_at, hidden_reason
  ) VALUES (
    v_conversation, v_responder, p_content, false,
    CASE WHEN v_hold THEN now() ELSE NULL END,
    CASE WHEN v_hold THEN 'Automatisch zurueckgehalten, wartet auf Sichtung durch die Moderation.' ELSE NULL END
  )
  RETURNING id INTO v_message;

  UPDATE letters
     SET status = 'answered', answered_at = now(), updated_at = now()
   WHERE id = v_letter.id;

  INSERT INTO safety_checks (
    target_type, target_id, sender_id, content_snapshot,
    risk_level, detected_categories, should_hold, reasoning,
    moderation_status, actions
  ) VALUES (
    'message', v_message, v_responder, p_content_snapshot, p_risk_level,
    COALESCE(p_detected_categories, '{}'), v_hold, p_reasoning,
    (CASE WHEN v_hold THEN 'open' ELSE 'resolved' END)::moderation_status,
    '[]'::jsonb
  );

  IF NOT v_hold THEN
    INSERT INTO notifications (recipient_id, conversation_id, type)
    VALUES (v_letter.author_id, v_conversation, 'new_response');
  END IF;

  conversation_id := v_conversation;
  message_id      := v_message;
  held            := v_hold;
  RETURN NEXT;
END;
$$;
