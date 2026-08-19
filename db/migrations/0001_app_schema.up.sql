-- Eigenes Schema fuer die Sicherheitsfunktionen, damit sie nicht im
-- oeffentlichen Namensraum der Anwendungstabellen liegen.
CREATE SCHEMA IF NOT EXISTS app;

COMMENT ON SCHEMA app IS
  'Hilfsfunktionen der Zugriffskontrolle. Nur SECURITY-DEFINER-Funktionen, keine Tabellen.';
