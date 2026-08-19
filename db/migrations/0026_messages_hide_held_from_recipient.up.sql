-- Zurueckgehaltene Nachrichten sind fuer den Empfaenger nicht sichtbar.
--
-- Die bisherige Policy aus Migration 0015 liess beide Teilnehmer jede
-- Nachricht des Briefwechsels sehen, auch eine von der Moderation
-- zurueckgehaltene. Das liesse sich in der Abfrage wegfiltern - dann haenge
-- die Zusage aber wieder an der Anwendungsschicht, und genau davon soll die
-- Sichtbarkeit hier nicht abhaengen.
--
-- Neue Regel: eine zurueckgehaltene Nachricht sieht nur, wer sie geschrieben
-- hat, und die Moderation. Der Absender soll sie sehen, damit ihm der Hinweis
-- angezeigt werden kann, dass sie geprueft wird.
--
-- deleted_at bleibt ausdruecklich unberuehrt: eine geloeschte Nachricht bleibt
-- fuer beide sichtbar, damit der Verlauf nicht abbricht. Sie traegt dann nur
-- keinen Inhalt mehr.
DROP POLICY messages_select_participant ON messages;

CREATE POLICY messages_select_participant ON messages
  FOR SELECT USING (
    app.is_moderator()
    OR (
      app.is_conversation_participant(conversation_id)
      AND (hidden_at IS NULL OR sender_id = app.current_user_id())
    )
  );
