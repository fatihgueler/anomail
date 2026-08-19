-- Alle Aufzaehlungen als echte PostgreSQL-Enums.
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');

CREATE TYPE letter_status AS ENUM ('waiting', 'in_progress', 'answered', 'flagged');

CREATE TYPE conversation_status AS ENUM ('active', 'archived');

-- Gemeinsam genutzt von reports.target_type und safety_checks.target_type.
CREATE TYPE target_type AS ENUM ('letter', 'message', 'conversation');

CREATE TYPE report_reason AS ENUM (
  'belaestigung',
  'beleidigung',
  'bedrohung',
  'sexuelle_inhalte',
  'persoenliche_daten',
  'spam',
  'gefaehrliche_inhalte',
  'sonstiges'
);

CREATE TYPE report_status AS ENUM ('pending', 'resolved');

CREATE TYPE notification_type AS ENUM ('new_response');

CREATE TYPE risk_level AS ENUM ('GREEN', 'YELLOW', 'RED', 'CRISIS');

CREATE TYPE moderation_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');
