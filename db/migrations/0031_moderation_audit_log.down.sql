DROP TRIGGER IF EXISTS moderation_audit_log_no_delete ON moderation_audit_log;
DROP TRIGGER IF EXISTS moderation_audit_log_no_update ON moderation_audit_log;
DROP FUNCTION IF EXISTS app.reject_audit_log_mutation();
DROP TABLE IF EXISTS moderation_audit_log;
DROP FUNCTION IF EXISTS app.is_admin();
DROP TYPE IF EXISTS audit_action;
