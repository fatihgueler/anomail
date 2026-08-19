DROP FUNCTION IF EXISTS delete_own_account(text);

-- Die NOT-NULL-Bedingungen lassen sich nur wiederherstellen, wenn keine
-- aufgeloesten Konten vorliegen. Deren Zeilen werden dafuer entfernt.
DELETE FROM users WHERE deleted_at IS NOT NULL;

ALTER TABLE users ALTER COLUMN anomail_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
