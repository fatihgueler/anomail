-- Additiv: eine nullable Spalte, keine Aenderung an bestehenden Daten.
--
-- Der Magic-Link-Ablauf braucht den Zeitpunkt, zu dem die E-Mail-Adresse
-- bestaetigt wurde. Bewusst NUR diese eine Spalte: der uebliche Auth.js-Adapter
-- verlangt zusaetzlich name und image, die bei einem anonymen Dienst dauerhaft
-- leer blieben. Deshalb liegt in lib/auth/adapter.ts ein eigener Adapter, der
-- ohne diese beiden Spalten auskommt.
ALTER TABLE users ADD COLUMN email_verified timestamptz;

COMMENT ON COLUMN users.email_verified IS
  'Zeitpunkt der Bestaetigung per Magic-Link. NULL, solange nicht bestaetigt.';

GRANT UPDATE (email_verified) ON users TO anomail_app;
