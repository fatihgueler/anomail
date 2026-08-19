-- Zurueckgezogene Anomail-IDs.
--
-- Warum eine eigene Tabelle und nicht "geloeschte Nutzerzeilen behalten":
--
-- Bei einer Kontoloeschung muss die Nutzerzeile verschwinden. Sie traegt die
-- E-Mail-Adresse und damit den Personenbezug; sie nur als Grabstein liegen zu
-- lassen, waere eine Aufbewahrung ohne Zweck und stuende gegen das
-- Loeschverlangen nach Art. 17 DSGVO.
--
-- Die Anomail-ID allein ist nach dem Loeschen der Zeile kein Personenbezug
-- mehr - sie zeigt auf niemanden. Genau diese Zeichenkette aufzubewahren ist
-- deshalb die sparsamste Form, das Versprechen aus der Datenschutzerklaerung
-- einzuloesen: eine einmal vergebene ID wird nie ein zweites Mal vergeben.
-- Sonst koennte ein frueherer Briefpartner eine ID wiedererkennen und einer
-- voellig anderen Person zuordnen.
CREATE TABLE retired_anomail_ids (
  anomail_id text        PRIMARY KEY,
  retired_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT retired_anomail_ids_format CHECK (
    anomail_id ~ '^AN-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$'
  )
);

COMMENT ON TABLE retired_anomail_ids IS
  'Nie erneut zu vergebende Kennungen. Enthaelt keinen Personenbezug, nur die Zeichenkette.';

-- Nur ueber die Dienstverbindung erreichbar: die Vergabe laeuft ohnehin dort,
-- und die Anwendungsrolle hat hier nichts zu suchen.
