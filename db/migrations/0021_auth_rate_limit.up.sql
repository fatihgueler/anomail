-- Ratenbegrenzung fuer den Magic-Link-Versand.
--
-- Ohne sie ist der Anmelde-Endpunkt ein Mailverstaerker: wer eine fremde
-- Adresse kennt, kann beliebig viele Mails an sie ausloesen.
--
-- Der Bezeichner wird NICHT im Klartext gespeichert, sondern als HMAC mit dem
-- Serverschluessel. Eine Ratenbegrenzung braucht nur Gleichheit, nicht den
-- Wert selbst. So entsteht keine zweite Sammelstelle fuer E-Mail-Adressen und
-- IP-Adressen, und ein Datenbankabzug allein gibt sie nicht preis.
CREATE TYPE rate_limit_scope AS ENUM ('email', 'ip');

CREATE TABLE auth_rate_limit_events (
  id             uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  scope          rate_limit_scope NOT NULL,
  identifier_hash text            NOT NULL,
  created_at     timestamptz      NOT NULL DEFAULT now()
);

COMMENT ON COLUMN auth_rate_limit_events.identifier_hash IS
  'HMAC-SHA256 aus E-Mail bzw. IP und AUTH_SECRET. Nie der Klartext.';

-- Traegt die Zaehlabfrage ueber das Zeitfenster.
CREATE INDEX auth_rate_limit_events_lookup_idx
  ON auth_rate_limit_events (scope, identifier_hash, created_at);

-- Traegt das Wegraeumen alter Eintraege.
CREATE INDEX auth_rate_limit_events_created_at_idx
  ON auth_rate_limit_events (created_at);
