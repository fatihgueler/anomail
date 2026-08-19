-- Brief anlegen: Brief, Kategorien und Pruefprotokoll in einem Schritt.
--
-- Warum eine Datenbankfunktion und nicht drei Anweisungen aus der Anwendung:
--
-- Der Brief und die zugehoerige safety_checks-Zeile duerfen nicht getrennt
-- entstehen. Die Anwendung koennte beides nicht in einer Transaktion
-- schreiben, weil safety_checks per RLS der Moderation vorbehalten ist - ein
-- gewoehnlicher Nutzer darf dort nicht einfuegen. Die Alternative waere, den
-- ganzen Vorgang ueber die Dienstverbindung laufen zu lassen und damit RLS
-- fuer eine Route mit Nutzereingabe abzuschalten. Genau das soll nicht
-- passieren.
--
-- SECURITY DEFINER loest das: der Autor wird aus app.current_user_id()
-- abgeleitet, nicht als Parameter uebergeben. Es gibt also keine ID aus dem
-- Request, mit der sich hier etwas unterschieben liesse.
CREATE FUNCTION create_letter(
  p_content             text,
  p_category_ids        uuid[],
  p_submission_id       uuid,
  p_risk_level          risk_level,
  p_should_hold         boolean,
  p_detected_categories text[],
  p_reasoning           text,
  p_content_snapshot    text
) RETURNS letters
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
DECLARE
  v_author    uuid := app.current_user_id();
  v_banned    timestamptz;
  v_letter    letters%ROWTYPE;
  v_hold      boolean;
  v_status    letter_status;
  v_known     integer;
BEGIN
  IF v_author IS NULL THEN
    RAISE EXCEPTION 'create_letter ohne angemeldeten Nutzer'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Sperre erneut pruefen. Der Guard in der Anwendung faengt den Regelfall ab;
  -- diese Pruefung haelt auch, wenn jemand die Aktion direkt aufruft.
  SELECT banned_at INTO v_banned FROM users WHERE id = v_author;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'create_letter: Nutzer % existiert nicht', v_author
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_banned IS NOT NULL THEN
    RAISE EXCEPTION 'create_letter: Konto ist gesperrt'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Laengengrenzen ein drittes Mal. Der Browser prueft fuer die Rueckmeldung,
  -- die Serveraktion fuer die Entscheidung, und hier liegt die letzte Grenze.
  IF char_length(p_content) < 80 OR char_length(p_content) > 4000 THEN
    RAISE EXCEPTION 'create_letter: Laenge % ausserhalb von 80..4000',
      char_length(p_content)
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_submission_id IS NULL THEN
    RAISE EXCEPTION 'create_letter: submission_id fehlt'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Alle Kategorien muessen existieren. Eine erfundene Kennung bricht ab,
  -- statt still weggelassen zu werden.
  IF p_category_ids IS NOT NULL AND array_length(p_category_ids, 1) > 0 THEN
    SELECT count(*) INTO v_known
      FROM categories c
     WHERE c.id = ANY (p_category_ids);

    IF v_known <> array_length(p_category_ids, 1) THEN
      RAISE EXCEPTION 'create_letter: unbekannte Kategorie in %', p_category_ids
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  END IF;

  -- CRISIS wird immer zurueckgehalten, auch wenn der Aufrufer etwas anderes
  -- meldet. Eine Untergrenze, die die Anwendung nicht senken kann: ein Brief
  -- mit akuten Selbstgefaehrdungs-Signalen geht nie an eine zufaellige,
  -- ungeschulte Privatperson.
  v_hold := COALESCE(p_should_hold, true) OR p_risk_level = 'CRISIS';
  v_status := CASE WHEN v_hold THEN 'flagged' ELSE 'waiting' END;

  INSERT INTO letters (author_id, content, status, submission_id, hidden_at, hidden_reason)
  VALUES (
    v_author,
    p_content,
    v_status,
    p_submission_id,
    CASE WHEN v_hold THEN now() ELSE NULL END,
    CASE WHEN v_hold THEN 'Automatisch zurueckgehalten, wartet auf Sichtung durch die Moderation.' ELSE NULL END
  )
  ON CONFLICT (submission_id) DO NOTHING
  RETURNING * INTO v_letter;

  IF NOT FOUND THEN
    -- Derselbe Absendevorgang ein zweites Mal. Es entsteht kein zweiter Brief
    -- und kein zweites Pruefprotokoll; der vorhandene Brief wird
    -- zurueckgegeben, damit der Aufrufer normal weiterlaufen kann.
    SELECT * INTO v_letter
      FROM letters
     WHERE submission_id = p_submission_id
       AND author_id = v_author;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'create_letter: submission_id % gehoert einem anderen Konto',
        p_submission_id
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN v_letter;
  END IF;

  IF p_category_ids IS NOT NULL AND array_length(p_category_ids, 1) > 0 THEN
    INSERT INTO letter_categories (letter_id, category_id)
    SELECT v_letter.id, c
      FROM unnest(p_category_ids) AS c
    ON CONFLICT DO NOTHING;
  END IF;

  -- Das Pruefprotokoll entsteht in derselben Transaktion wie der Brief.
  -- Schlaegt es fehl, gibt es auch keinen Brief.
  INSERT INTO safety_checks (
    target_type, target_id, sender_id, content_snapshot,
    risk_level, detected_categories, should_hold, reasoning,
    moderation_status, actions
  ) VALUES (
    'letter',
    v_letter.id,
    v_author,
    p_content_snapshot,
    p_risk_level,
    COALESCE(p_detected_categories, '{}'),
    v_hold,
    p_reasoning,
    -- Ohne Typangabe liefert CASE hier text, nicht moderation_status.
    (CASE WHEN v_hold THEN 'open' ELSE 'resolved' END)::moderation_status,
    '[]'::jsonb
  );

  RETURN v_letter;
END;
$$;

COMMENT ON FUNCTION create_letter(text, uuid[], uuid, risk_level, boolean, text[], text, text) IS
  'Legt Brief, Kategorien und Pruefprotokoll atomar an. Autor kommt aus app.current_user_id().';

REVOKE EXECUTE ON FUNCTION create_letter(text, uuid[], uuid, risk_level, boolean, text[], text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_letter(text, uuid[], uuid, risk_level, boolean, text[], text, text) TO anomail_app;
