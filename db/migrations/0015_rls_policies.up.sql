-- Row Level Security.
--
-- Dies ist die Sicherheitsgrenze der Anwendung. Nichts oberhalb der Datenbank
-- darf sich darauf verlassen, richtig zu filtern.
--
-- Alle Tabellen laufen mit ENABLE, nicht FORCE ROW LEVEL SECURITY. Das ist
-- Absicht: die SECURITY-DEFINER-Hilfsfunktionen aus Migration 0014 muessen als
-- Eigentuemer an den Zeilen vorbeisehen koennen, sonst entstehen zirkulaere
-- Auswertungen. Die Anwendung verbindet sich dafuer ausschliesslich als
-- anomail_app, also nie als Eigentuemer. lib/db/client.ts prueft das beim
-- Verbindungsaufbau und verweigert den Start, wenn es nicht stimmt.
--
-- categories bekommt bewusst keine RLS: die Tabelle hat keinen Nutzerbezug,
-- ist ein statisches Nachschlagewerk und nur lesbar.

-- ---------------------------------------------------------------- users -----
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Eigene Zeile vollstaendig lesbar; fremde Zeilen gar nicht, damit die
-- E-Mail-Adresse anderer Nutzer nie im Ergebnis auftauchen kann.
CREATE POLICY users_select_self ON users
  FOR SELECT USING (id = app.current_user_id() OR app.is_moderator());

-- Registrierung nur als gewoehnlicher Nutzer; keine Selbstvergabe von Rollen.
CREATE POLICY users_insert_plain ON users
  FOR INSERT WITH CHECK (role = 'user' AND banned_at IS NULL);

-- Nur die eigene Zeile aenderbar; welche Spalten, regelt der Spaltenzugriff.
CREATE POLICY users_update_self ON users
  FOR UPDATE USING (id = app.current_user_id())
  WITH CHECK (id = app.current_user_id());

-- -------------------------------------------------------------- letters -----
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

-- Autor, zugewiesener Responder, oder ein wartender fremder Brief ohne
-- Blockierung in einer der beiden Richtungen. Moderatoren sehen alles.
CREATE POLICY letters_select ON letters
  FOR SELECT USING (
    app.is_moderator()
    OR author_id = app.current_user_id()
    OR responder_id = app.current_user_id()
    OR (
      status = 'waiting'
      AND author_id <> app.current_user_id()
      AND deleted_at IS NULL
      AND hidden_at IS NULL
      AND NOT app.is_blocked_between(app.current_user_id(), author_id)
    )
  );

-- Ein Brief kann nur im eigenen Namen geschrieben werden.
CREATE POLICY letters_insert_own ON letters
  FOR INSERT WITH CHECK (author_id = app.current_user_id());

-- Aendern darf der Autor, der zugewiesene Responder und die Moderation.
CREATE POLICY letters_update ON letters
  FOR UPDATE USING (
    app.is_moderator()
    OR author_id = app.current_user_id()
    OR responder_id = app.current_user_id()
  )
  WITH CHECK (
    app.is_moderator()
    OR author_id = app.current_user_id()
    OR responder_id = app.current_user_id()
  );

-- --------------------------------------------------- letter_categories -----
ALTER TABLE letter_categories ENABLE ROW LEVEL SECURITY;

-- Die Verknuepfung ist genau dann sichtbar, wenn der Brief selbst sichtbar ist.
CREATE POLICY letter_categories_select ON letter_categories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM letters l WHERE l.id = letter_id)
  );

-- Kategorien setzen darf nur der Autor des Briefs.
CREATE POLICY letter_categories_insert_own ON letter_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM letters l
      WHERE l.id = letter_id AND l.author_id = app.current_user_id()
    )
  );

-- Entfernen ebenfalls nur der Autor des Briefs.
CREATE POLICY letter_categories_delete_own ON letter_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM letters l
      WHERE l.id = letter_id AND l.author_id = app.current_user_id()
    )
  );

-- -------------------------------------------------------- conversations -----
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Nur die beiden Teilnehmer sehen den Briefwechsel. Moderatoren sehen alles.
CREATE POLICY conversations_select_participant ON conversations
  FOR SELECT USING (
    app.is_moderator()
    OR app.current_user_id() IN (participant_a_id, participant_b_id)
  );

-- Ein Briefwechsel entsteht nur mit dem Anlegenden als einem der Teilnehmer.
CREATE POLICY conversations_insert_participant ON conversations
  FOR INSERT WITH CHECK (
    app.current_user_id() IN (participant_a_id, participant_b_id)
  );

-- Aendern duerfen nur die beiden Teilnehmer, etwa beim Archivieren.
CREATE POLICY conversations_update_participant ON conversations
  FOR UPDATE USING (
    app.current_user_id() IN (participant_a_id, participant_b_id)
  )
  WITH CHECK (
    app.current_user_id() IN (participant_a_id, participant_b_id)
  );

-- ------------------------------------------------------------- messages -----
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Lesen nur als Teilnehmer der zugehoerigen Conversation.
CREATE POLICY messages_select_participant ON messages
  FOR SELECT USING (
    app.is_moderator()
    OR app.is_conversation_participant(conversation_id)
  );

-- Schreiben nur im eigenen Namen und nur in eigene Conversations.
CREATE POLICY messages_insert_own ON messages
  FOR INSERT WITH CHECK (
    sender_id = app.current_user_id()
    AND app.is_conversation_participant(conversation_id)
  );

-- Aendern nur die eigene Nachricht, etwa zum Loeschen.
CREATE POLICY messages_update_own ON messages
  FOR UPDATE USING (sender_id = app.current_user_id())
  WITH CHECK (sender_id = app.current_user_id());

-- -------------------------------------------------------------- reports -----
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Der Melder sieht seine eigenen Meldungen, die Moderation alle.
CREATE POLICY reports_select ON reports
  FOR SELECT USING (
    app.is_moderator() OR reporter_id = app.current_user_id()
  );

-- Melden darf jeder angemeldete Nutzer, aber nur im eigenen Namen.
CREATE POLICY reports_insert_own ON reports
  FOR INSERT WITH CHECK (reporter_id = app.current_user_id());

-- Bearbeiten und begruenden darf ausschliesslich die Moderation.
CREATE POLICY reports_update_moderator ON reports
  FOR UPDATE USING (app.is_moderator())
  WITH CHECK (app.is_moderator());

-- --------------------------------------------------------------- blocks -----
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Die eigene Blockierliste ist sichtbar; wer einen selbst blockiert, nicht.
CREATE POLICY blocks_select_own ON blocks
  FOR SELECT USING (blocker_id = app.current_user_id());

-- Blockieren nur im eigenen Namen.
CREATE POLICY blocks_insert_own ON blocks
  FOR INSERT WITH CHECK (blocker_id = app.current_user_id());

-- Aufheben nur die eigene Blockierung.
CREATE POLICY blocks_delete_own ON blocks
  FOR DELETE USING (blocker_id = app.current_user_id());

-- -------------------------------------------------------- notifications -----
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Nur der Empfaenger sieht seine Benachrichtigungen.
CREATE POLICY notifications_select_recipient ON notifications
  FOR SELECT USING (recipient_id = app.current_user_id());

-- Nur der Empfaenger darf sie als gelesen markieren.
CREATE POLICY notifications_update_recipient ON notifications
  FOR UPDATE USING (recipient_id = app.current_user_id())
  WITH CHECK (recipient_id = app.current_user_id());

-- ------------------------------------------------------- safety_checks -----
ALTER TABLE safety_checks ENABLE ROW LEVEL SECURITY;

-- Ausschliesslich Moderatoren und Admins, fuer jeden Zugriff.
CREATE POLICY safety_checks_moderator_only ON safety_checks
  FOR ALL USING (app.is_moderator())
  WITH CHECK (app.is_moderator());
