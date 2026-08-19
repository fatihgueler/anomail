DROP FUNCTION IF EXISTS moderation_review_appeal(uuid, appeal_status, text);
DROP FUNCTION IF EXISTS moderation_update_safety_check(uuid, moderation_status, text);
DROP FUNCTION IF EXISTS moderation_resolve_report(uuid, text);
DROP FUNCTION IF EXISTS moderation_set_ban(uuid, boolean, text);
DROP FUNCTION IF EXISTS moderation_unhide_content(text, uuid, text);
DROP FUNCTION IF EXISTS moderation_hide_content(text, uuid, text);
DROP FUNCTION IF EXISTS moderation_record_view(text, uuid);
DROP FUNCTION IF EXISTS app.require_moderator();
DROP FUNCTION IF EXISTS app.write_audit(audit_action, text, uuid, text);
