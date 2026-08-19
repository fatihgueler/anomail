-- Additiv: eine nullable Spalte plus eindeutiger Index.
--
-- Schutz gegen Doppelabsenden. Ein deaktivierter Knopf im Browser ist keine
-- Absicherung - ein zweiter Tab, ein Zurueck-Knopf oder ein wiederholtes
-- Formular-POST umgehen ihn. Die einzige verlaessliche Stelle ist ein
-- eindeutiger Index: der zweite Versuch mit derselben Kennung kann schlicht
-- keine zweite Zeile erzeugen.
--
-- Nullable, damit bestehende Briefe und der Seed unberuehrt bleiben. Mehrere
-- NULL-Werte verletzt ein UNIQUE-Index in PostgreSQL nicht.
ALTER TABLE letters ADD COLUMN submission_id uuid;

COMMENT ON COLUMN letters.submission_id IS
  'Kennung des Absendevorgangs. Wird beim Rendern des Formulars vergeben und macht das Absenden wiederholbar ohne Doppeleintrag.';

-- Kein partieller Index: PostgreSQL laesst in einem UNIQUE-Index ohnehin
-- beliebig viele NULL-Werte zu. Ein voller Index haelt zudem die
-- ON-CONFLICT-Ableitung in create_letter() einfach.
CREATE UNIQUE INDEX letters_submission_id_key ON letters (submission_id);
