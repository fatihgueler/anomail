-- Tabellen fuer Auth.js.
--
-- Bewusst OHNE Row Level Security und OHNE Rechte fuer anomail_app.
--
-- Der Grund: waehrend der Anmeldung gibt es noch keinen angemeldeten Nutzer.
-- app.current_user_id ist zwangslaeufig leer, jede RLS-Policy wuerde also
-- greifen und der Anmeldevorgang koennte seine eigene Sitzung nicht anlegen.
-- Diese Tabellen sind deshalb ausschliesslich ueber die Dienstverbindung
-- erreichbar (siehe withServiceRole in lib/db/client.ts). Fuer die
-- Anwendungsrolle existieren sie schlicht nicht - kein Recht ist strenger als
-- jede Policy.

CREATE TABLE sessions (
  session_token text        PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires       timestamptz NOT NULL
);

-- Traegt das Aufraeumen abgelaufener Sitzungen und die Abmeldung aller Geraete.
CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_idx ON sessions (expires);

CREATE TABLE accounts (
  user_id             uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type                text NOT NULL,
  provider            text NOT NULL,
  provider_account_id text NOT NULL,
  refresh_token       text,
  access_token        text,
  expires_at          integer,
  token_type          text,
  scope               text,
  id_token            text,
  session_state       text,
  PRIMARY KEY (provider, provider_account_id)
);

CREATE INDEX accounts_user_id_idx ON accounts (user_id);

COMMENT ON TABLE accounts IS
  'Von Auth.js vorgesehen. Bleibt leer, solange es nur Magic-Link und kein OAuth gibt.';

CREATE TABLE verification_tokens (
  identifier text        NOT NULL,
  token      text        NOT NULL,
  expires    timestamptz NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Abgelaufene Token muessen sich guenstig wegraeumen lassen.
CREATE INDEX verification_tokens_expires_idx ON verification_tokens (expires);
