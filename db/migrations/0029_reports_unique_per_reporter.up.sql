-- Eine Person meldet denselben Inhalt genau einmal.
--
-- Die Pruefung darf nicht als vorheriges SELECT in der Anwendung liegen:
-- zwischen Nachsehen und Einfuegen koennte ein zweiter Klick dieselbe Meldung
-- anlegen. Der eindeutige Index entscheidet das verlaesslich, und die
-- Anwendung liest die Unique-Verletzung als "liegt bereits vor".
CREATE UNIQUE INDEX reports_reporter_target_key
  ON reports (reporter_id, target_type, target_id);

COMMENT ON INDEX reports_reporter_target_key IS
  'Verhindert Doppelmeldungen desselben Inhalts durch dieselbe Person.';
