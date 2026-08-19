-- Prüfprotokoll der Moderation.
--
-- Die Moderationsansicht ist die einzige Stelle der Anwendung, an der fremde
-- Inhalte im Klartext sichtbar sind. Menschen schreiben hier ueber das, was sie
-- belastet. Ohne Protokoll waere ein Missbrauch dieser Rolle nicht
-- feststellbar - deshalb wird nicht nur jede Aktion, sondern auch jeder
-- lesende Zugriff festgehalten.

CREATE TYPE audit_action AS ENUM (
  'viewed',
  'hidden',
  'unhidden',
  'resolved',
  'dismissed',
  'banned',
  'unbanned',
  'appeal_reviewed'
);

CREATE TABLE moderation_audit_log (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid         NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  action      audit_action NOT NULL,
  target_type text         NOT NULL,
  target_id   uuid,
  note        text,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX moderation_audit_log_created_at_idx
  ON moderation_audit_log (created_at DESC);
CREATE INDEX moderation_audit_log_actor_idx
  ON moderation_audit_log (actor_id, created_at DESC);

-- app.is_admin fehlte bisher. Die Moderation unterscheidet an zwei Stellen
-- zwischen moderator und admin: beim Protokoll und bei der Frage, ob mehrere
-- Vorfaelle demselben Konto zuzuordnen sind.
CREATE FUNCTION app.is_admin() RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = app.current_user_id()
      AND u.role = 'admin'
      AND u.banned_at IS NULL
  );
$$;

COMMENT ON FUNCTION app.is_admin() IS
  'Wahr nur fuer nicht gesperrte Admins. Moderatoren sind hier ausdruecklich nicht eingeschlossen.';

REVOKE EXECUTE ON FUNCTION app.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.is_admin() TO anomail_app;

ALTER TABLE moderation_audit_log ENABLE ROW LEVEL SECURITY;

-- Lesen ausschliesslich Admins. Moderatoren sehen ihr eigenes Protokoll
-- bewusst nicht: wer geprueft wird, soll nicht sehen koennen, was geprueft wird.
CREATE POLICY moderation_audit_log_select_admin ON moderation_audit_log
  FOR SELECT USING (app.is_admin());

/*
 * Unveraenderlichkeit, zweifach abgesichert.
 *
 * 1. Der Anwendungsrolle wird ausschliesslich SELECT erteilt. Sie kann weder
 *    einfuegen noch aendern noch loeschen. Eintraege entstehen nur ueber die
 *    SECURITY-DEFINER-Funktionen der Moderation.
 * 2. Ein Trigger weist UPDATE und DELETE ab - auch fuer den Eigentuemer und
 *    auch fuer die Dienstverbindung. Rechte allein wuerden nur die Anwendung
 *    binden; der Trigger bindet jeden Weg, der ueber SQL laeuft.
 */
GRANT SELECT ON moderation_audit_log TO anomail_app;

CREATE FUNCTION app.reject_audit_log_mutation() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION
    'Das Pruefprotokoll ist unveraenderlich. % ist auf moderation_audit_log nicht zulaessig.',
    TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER moderation_audit_log_no_update
  BEFORE UPDATE ON moderation_audit_log
  FOR EACH ROW EXECUTE FUNCTION app.reject_audit_log_mutation();

CREATE TRIGGER moderation_audit_log_no_delete
  BEFORE DELETE ON moderation_audit_log
  FOR EACH ROW EXECUTE FUNCTION app.reject_audit_log_mutation();

COMMENT ON TABLE moderation_audit_log IS
  'Unveraenderlich. Jede Moderationsaktion und jeder lesende Zugriff auf fremde Inhalte.';
