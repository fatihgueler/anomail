-- Kontoauflösung.
--
-- Die Nutzerzeile bleibt bestehen, verliert aber jeden Personenbezug. Sie
-- gelöscht zu entfernen wäre nicht möglich, ohne fremde Daten zu beschädigen:
-- reports.reporter_id, messages.sender_id und conversations.participant_*
-- zeigen darauf, und der Verlauf der jeweils anderen Person soll intakt
-- bleiben.
--
-- Was verschwindet: die E-Mail-Adresse und die Anomail-ID. Was bleibt: eine
-- anonyme Zeile, die nur noch als Anker für fremde Verläufe dient.

ALTER TABLE users ADD COLUMN deleted_at timestamptz;

COMMENT ON COLUMN users.deleted_at IS
  'Kontoaufloesung durch den Nutzer. Die Zeile bleibt als anonymer Anker fuer fremde Verlaeufe bestehen.';

-- Beide Spalten müssen leerbar werden, damit der Personenbezug wirklich
-- verschwindet und nicht nur überschrieben wird.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN anomail_id DROP NOT NULL;

-- Die Anwendungsrolle darf diese Felder beim Löschen nicht selbst schreiben:
-- der Vorgang läuft über delete_own_account(), damit er vollständig oder gar
-- nicht passiert.

/**
 * Löst das eigene Konto auf.
 *
 * Läuft vollständig in einer Transaktion. SECURITY DEFINER, weil der Vorgang
 * Tabellen berührt, die der Anwendungsrolle verschlossen sind
 * (retired_anomail_ids, sessions, notifications fremder Zeilen) und weil
 * users.email und users.anomail_id nicht im Spaltenrecht der Rolle stehen.
 *
 * Der Nutzer kommt aus app.current_user_id() und ist nicht als Parameter
 * setzbar - es gibt also keinen Weg, ein fremdes Konto aufzulösen.
 *
 * Fehlercodes:
 *   AN030  keine Sitzung
 *   AN031  Bestätigung stimmt nicht mit der eigenen Anomail-ID überein
 */
CREATE FUNCTION delete_own_account(p_confirmation text) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user    uuid := app.current_user_id();
  v_anomail text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Keine Sitzung' USING ERRCODE = 'AN030';
  END IF;

  SELECT anomail_id INTO v_anomail
    FROM users
   WHERE id = v_user AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Keine Sitzung' USING ERRCODE = 'AN030';
  END IF;

  -- Die Bestätigung wird hier geprüft, nicht nur im Formular.
  IF v_anomail IS DISTINCT FROM btrim(upper(COALESCE(p_confirmation, ''))) THEN
    RAISE EXCEPTION 'Bestaetigung stimmt nicht' USING ERRCODE = 'AN031';
  END IF;

  -- 1. Die Kennung wird zurückgezogen und nie erneut vergeben.
  INSERT INTO retired_anomail_ids (anomail_id)
  VALUES (v_anomail)
  ON CONFLICT (anomail_id) DO NOTHING;

  -- 2. Wartende Briefe verschwinden - sie erreichen niemanden mehr.
  DELETE FROM letter_categories lc
   USING letters l
   WHERE lc.letter_id = l.id
     AND l.author_id = v_user
     AND l.status = 'waiting';

  DELETE FROM letters
   WHERE author_id = v_user
     AND status = 'waiting';

  -- 3. Bereits zugewiesene oder beantwortete Briefe bleiben als Anker des
  --    fremden Verlaufs bestehen, verlieren aber ihren Inhalt.
  UPDATE letters
     SET content    = '',
         deleted_at = now(),
         updated_at = now()
   WHERE author_id = v_user
     AND deleted_at IS NULL;

  -- 4. Eigene Nachrichten werden zu Platzhaltern. Die Blase bleibt stehen,
  --    damit der Verlauf der anderen Person nicht abbricht.
  UPDATE messages
     SET content    = '',
         deleted_at = now()
   WHERE sender_id = v_user
     AND deleted_at IS NULL;

  -- 5. Gespräche mit einer anderen beteiligten Person werden archiviert,
  --    nicht gelöscht.
  UPDATE conversations
     SET status     = 'archived',
         updated_at = now()
   WHERE (participant_a_id = v_user OR participant_b_id = v_user)
     AND status = 'active';

  -- 6. Rein eigene Daten verschwinden.
  DELETE FROM notifications WHERE recipient_id = v_user;
  DELETE FROM blocks WHERE blocker_id = v_user OR blocked_id = v_user;

  -- 7. Meldungen und Prüfungen bleiben als Vorgang erhalten. Ihr
  --    Personenbezug besteht nur noch aus dem Verweis auf die gleich
  --    anonymisierte Zeile. Der Inhaltsabzug wird geleert.
  UPDATE safety_checks
     SET content_snapshot = ''
   WHERE sender_id = v_user;

  -- 8. Alle Sitzungen enden sofort.
  DELETE FROM sessions WHERE user_id = v_user;
  DELETE FROM accounts WHERE user_id = v_user;

  -- 9. Der Personenbezug der Nutzerzeile selbst verschwindet.
  UPDATE users
     SET email                 = NULL,
         anomail_id            = NULL,
         email_verified        = NULL,
         banned_reason         = NULL,
         notifications_enabled = false,
         deleted_at            = now(),
         updated_at            = now()
   WHERE id = v_user;
END;
$$;

COMMENT ON FUNCTION delete_own_account(text) IS
  'Loest das eigene Konto sofort und vollstaendig auf. Nutzer kommt aus app.current_user_id().';

REVOKE EXECUTE ON FUNCTION delete_own_account(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_own_account(text) TO anomail_app;
