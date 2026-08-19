DROP POLICY IF EXISTS safety_checks_moderator_only ON safety_checks;
ALTER TABLE safety_checks DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_update_recipient ON notifications;
DROP POLICY IF EXISTS notifications_select_recipient ON notifications;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS blocks_delete_own ON blocks;
DROP POLICY IF EXISTS blocks_insert_own ON blocks;
DROP POLICY IF EXISTS blocks_select_own ON blocks;
ALTER TABLE blocks DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_update_moderator ON reports;
DROP POLICY IF EXISTS reports_insert_own ON reports;
DROP POLICY IF EXISTS reports_select ON reports;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_update_own ON messages;
DROP POLICY IF EXISTS messages_insert_own ON messages;
DROP POLICY IF EXISTS messages_select_participant ON messages;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversations_update_participant ON conversations;
DROP POLICY IF EXISTS conversations_insert_participant ON conversations;
DROP POLICY IF EXISTS conversations_select_participant ON conversations;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS letter_categories_delete_own ON letter_categories;
DROP POLICY IF EXISTS letter_categories_insert_own ON letter_categories;
DROP POLICY IF EXISTS letter_categories_select ON letter_categories;
ALTER TABLE letter_categories DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS letters_update ON letters;
DROP POLICY IF EXISTS letters_insert_own ON letters;
DROP POLICY IF EXISTS letters_select ON letters;
ALTER TABLE letters DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_update_self ON users;
DROP POLICY IF EXISTS users_insert_plain ON users;
DROP POLICY IF EXISTS users_select_self ON users;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
