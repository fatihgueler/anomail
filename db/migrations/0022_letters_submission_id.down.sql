DROP INDEX IF EXISTS letters_submission_id_key;
ALTER TABLE letters DROP COLUMN IF EXISTS submission_id;
