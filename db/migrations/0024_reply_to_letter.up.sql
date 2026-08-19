-- Antworten auf einen zugewiesenen Brief, in einem Schritt.
--
-- Warum wieder eine Datenbankfunktion:
--
-- Der Vorgang beruehrt fuenf Tabellen, und drei davon sind der Anwendungsrolle
-- per RLS verschlossen oder verschlossen genug, dass es ohne SECURITY DEFINER
-- nicht ginge:
--
--   messages       - die Original-Nachricht traegt sender_id = Briefautor,
--                    die Policy messages_insert_own verlangt aber
--                    sender_id = app.current_user_id(). Der Antwortende darf
--                    also nicht im Namen des Autors einfuegen.
--   safety_checks  - der Moderation vorbehalten.
--   notifications  - hat fuer anomail_app gar kein INSERT-Recht.
--
-- Die Alternative waere, den ganzen Vorgang ueber die Dienstverbindung laufen
-- zu lassen und RLS fuer eine Route mit Nutzereingabe abzuschalten. Genau das
-- soll nicht passieren.
--
-- Der Antwortende wird aus app.current_user_id() abgeleitet, nicht als
-- Parameter uebergeben. Die einzige ID aus dem Request ist p_letter_id, und
-- die wird gegen die tatsaechliche Zuweisung geprueft, bevor irgendetwas
-- geschrieben wird.
--
-- Eigene Fehlercodes, damit die Anwendung den Grund benennen kann statt einen
-- Sammelfehler anzuzeigen:
--   AN001  Brief ist dir nicht zugewiesen
--   AN002  Zuweisung abgelaufen oder inzwischen neu vergeben
--   AN003  Brief ist bereits beantwortet
--   AN004  Konto gesperrt
--   AN005  Laenge ausserhalb der Grenzen

CREATE FUNCTION reply_to_letter(
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

  -- Die Zuweisung wird geprueft, bevor irgendetwas geschrieben wird, und die
  -- Zeile bleibt bis zum Ende der Transaktion gesperrt. Ohne FOR UPDATE
  -- koennte release_expired_leases() mitten im Vorgang dazwischenfahren.
  SELECT * INTO v_letter FROM letters WHERE id = p_letter_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Brief nicht gefunden' USING ERRCODE = 'AN001';
  END IF;

  IF v_letter.status = 'answered' THEN
    RAISE EXCEPTION 'Brief ist bereits beantwortet' USING ERRCODE = 'AN003';
  END IF;

  IF v_letter.responder_id IS DISTINCT FROM v_responder THEN
    -- Entweder nie zugewiesen oder inzwischen an jemand anderen vergeben.
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

  -- 5. Briefwechsel suchen oder anlegen.
  SELECT c.id INTO v_conversation
    FROM conversations c
   WHERE c.original_letter_id = v_letter.id
   LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO conversations (original_letter_id, participant_a_id, participant_b_id)
    VALUES (v_letter.id, v_letter.author_id, v_responder)
    RETURNING id INTO v_conversation;
  END IF;

  -- 6. Der Brieftext wird zur ersten Nachricht. Absender ist der Briefautor,
  --    nicht der Antwortende - deshalb geht das nur hier drin.
  SELECT EXISTS (
    SELECT 1 FROM messages m
     WHERE m.conversation_id = v_conversation AND m.is_original
  ) INTO v_has_original;

  IF NOT v_has_original THEN
    INSERT INTO messages (conversation_id, sender_id, content, is_original, created_at)
    VALUES (v_conversation, v_letter.author_id, v_letter.content, true, v_letter.created_at);
  END IF;

  -- 7. Die Antwort. Zurueckgehalten wird ueber hidden_at, niemals ueber
  --    deleted_at: das eine ist eine Moderationssperre, das andere eine
  --    Loeschung durch den Nutzer. Beide Zustaende auseinanderzuhalten war
  --    einer der Konstruktionsfehler des Altsystems.
  INSERT INTO messages (
    conversation_id, sender_id, content, is_original, hidden_at, hidden_reason
  ) VALUES (
    v_conversation,
    v_responder,
    p_content,
    false,
    CASE WHEN v_hold THEN now() ELSE NULL END,
    CASE WHEN v_hold THEN 'Automatisch zurueckgehalten, wartet auf Sichtung durch die Moderation.' ELSE NULL END
  )
  RETURNING id INTO v_message;

  -- 8. Der Brief gilt als beantwortet.
  UPDATE letters
     SET status      = 'answered',
         answered_at = now(),
         updated_at  = now()
   WHERE id = v_letter.id;

  -- 9. Pruefprotokoll, verknuepft mit der Nachricht.
  INSERT INTO safety_checks (
    target_type, target_id, sender_id, content_snapshot,
    risk_level, detected_categories, should_hold, reasoning,
    moderation_status, actions
  ) VALUES (
    'message',
    v_message,
    v_responder,
    p_content_snapshot,
    p_risk_level,
    COALESCE(p_detected_categories, '{}'),
    v_hold,
    p_reasoning,
    (CASE WHEN v_hold THEN 'open' ELSE 'resolved' END)::moderation_status,
    '[]'::jsonb
  );

  -- 10. Benachrichtigung nur, wenn es auch etwas zu sehen gibt. Eine
  --     Benachrichtigung auf eine zurueckgehaltene Nachricht wuerde ins Leere
  --     zeigen.
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

COMMENT ON FUNCTION reply_to_letter(uuid, text, risk_level, boolean, text[], text, text) IS
  'Antwort, Briefwechsel, Original-Nachricht, Pruefprotokoll und Benachrichtigung atomar. Antwortender kommt aus app.current_user_id().';

-- Zuweisung vorzeitig zurueckgeben.
--
-- Auch das braucht SECURITY DEFINER: die Policy letters_update erlaubt dem
-- Antwortenden zwar das Aendern, ihr WITH CHECK prueft aber die NEUE Zeile.
-- Sobald responder_id auf NULL gesetzt ist, ist der Nutzer dort weder Autor
-- noch Responder - die eigene Freigabe wuerde also an der eigenen Aenderung
-- scheitern.
CREATE FUNCTION release_letter_assignment(p_letter_id uuid) RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user    uuid := app.current_user_id();
  v_updated integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'release_letter_assignment ohne angemeldeten Nutzer'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE letters
     SET status       = 'waiting',
         responder_id = NULL,
         assigned_at  = NULL,
         updated_at   = now()
   WHERE id = p_letter_id
     AND status = 'in_progress'
     AND responder_id = v_user;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Kein Fehler, wenn nichts passte: der Brief war schon zurueckgegeben oder
  -- neu vergeben. Das ist kein Problem des Nutzers.
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION release_letter_assignment(uuid) IS
  'Gibt eine eigene Zuweisung sofort frei, statt die Lease ablaufen zu lassen.';

REVOKE EXECUTE ON FUNCTION reply_to_letter(uuid, text, risk_level, boolean, text[], text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION release_letter_assignment(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION reply_to_letter(uuid, text, risk_level, boolean, text[], text, text) TO anomail_app;
GRANT EXECUTE ON FUNCTION release_letter_assignment(uuid) TO anomail_app;
