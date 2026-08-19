-- Zurueck auf die Fassung aus Migration 0015.
DROP POLICY messages_select_participant ON messages;

CREATE POLICY messages_select_participant ON messages
  FOR SELECT USING (
    app.is_moderator()
    OR app.is_conversation_participant(conversation_id)
  );
