import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";

import * as schema from "@/db/schema";

/**
 * Der einzige Weg in die Datenbank.
 *
 * Diese Schicht filtert nichts. Sie setzt den Nutzerkontext, gegen den die
 * RLS-Policies aus AP2 geschrieben sind. Wer welche Zeile sieht, entscheidet
 * die Datenbank.
 *
 * Aus diesem Modul wird bewusst KEINE Drizzle-Instanz und KEIN Pool
 * exportiert. Gaebe es die, koennte eine spaetere Route versehentlich eine
 * nutzerbezogene Abfrage ohne Kontext absetzen - und genau das war der Fehler
 * des Altsystems.
 */

export type Db = NodePgDatabase<typeof schema>;

/** Was withUser mindestens braucht. Passt auf die Auth.js-Session. */
export type UserContext = {
  user?: { id?: string | null } | null;
} | null;

let appPool: Pool | undefined;
let servicePool: Pool | undefined;

function requireEnv(name: string, hint: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} fehlt. ${hint}`);
  }

  return value;
}

function getAppPool(): Pool {
  if (!appPool) {
    appPool = new Pool({
      connectionString: requireEnv(
        "DATABASE_URL_APP",
        "Die Anwendung verbindet sich als anomail_app, nicht als Eigentuemer.",
      ),
    });
  }

  return appPool;
}

function getServicePool(): Pool {
  if (!servicePool) {
    servicePool = new Pool({
      connectionString: requireEnv(
        "DATABASE_URL",
        "Die Dienstverbindung laeuft als Eigentuemer und wird fuer Anmeldung und Wartung gebraucht.",
      ),
    });
  }

  return servicePool;
}

export async function closePools(): Promise<void> {
  await Promise.all([appPool?.end(), servicePool?.end()]);
  appPool = undefined;
  servicePool = undefined;
}

/**
 * Prueft, dass die Verbindung wirklich RLS unterliegt.
 *
 * Ein Superuser und der Eigentuemer einer Tabelle umgehen Row Level Security
 * vollstaendig - und zwar lautlos. Verbindet sich die Anwendung versehentlich
 * so, waeren alle Policies wirkungslos, ohne dass irgendein Test oder Log
 * darauf hinweisen wuerde. Deshalb der harte Abbruch statt einer Warnung.
 */
export async function assertRlsAppliesToConnection(
  client: PoolClient,
): Promise<void> {
  const { rows } = await client.query<{
    is_superuser: boolean;
    owns_letters: boolean;
    role_name: string;
  }>(`
    SELECT
      current_setting('is_superuser') = 'on'                 AS is_superuser,
      pg_catalog.pg_get_userbyid(c.relowner) = current_user  AS owns_letters,
      current_user                                           AS role_name
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'letters' AND n.nspname = 'public'
  `);

  const check = rows[0];

  if (!check) {
    throw new Error(
      "Tabelle public.letters nicht gefunden. Migrationen wurden nicht angewendet.",
    );
  }

  if (check.is_superuser) {
    throw new Error(
      `Verbindung laeuft als Superuser (${check.role_name}). Superuser umgehen RLS - Abbruch.`,
    );
  }

  if (check.owns_letters) {
    throw new Error(
      `Verbindung laeuft als Tabelleneigentuemer (${check.role_name}). Eigentuemer umgehen RLS - Abbruch.`,
    );
  }
}

/** Fehlender Nutzerkontext. Eigener Typ, damit Aufrufer ihn erkennen koennen. */
export class MissingUserContextError extends Error {
  constructor() {
    super(
      "withUser ohne angemeldeten Nutzer aufgerufen. Ohne Kontext greift keine RLS-Policy richtig.",
    );
    this.name = "MissingUserContextError";
  }
}

/**
 * Fuehrt eine Arbeitseinheit im Namen genau eines Nutzers aus.
 *
 * set_config(..., true) ist die Funktionsform von SET LOCAL: die Variable gilt
 * nur bis COMMIT oder ROLLBACK. Das ist Pflicht und keine Feinheit - mit einem
 * einfachen SET bliebe der Wert an der gepoolten Verbindung haengen und die
 * naechste Anfrage eines anderen Nutzers liefe im fremden Kontext weiter.
 *
 * Ohne Session wirft der Aufruf. Ein stiller Rueckfall auf "kein Nutzer" waere
 * schlimmer als ein Fehler: die Abfrage liefe durch und lieferte je nach
 * Policy entweder nichts oder zu viel.
 */
export async function withUser<T>(
  context: UserContext,
  work: (db: Db, client: PoolClient) => Promise<T>,
): Promise<T> {
  const userId = context?.user?.id;

  if (!userId) {
    throw new MissingUserContextError();
  }

  const client = await getAppPool().connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [
      userId,
    ]);

    const result = await work(drizzle(client, { schema }), client);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * ACHTUNG: umgeht Row Level Security vollstaendig.
 *
 * Laeuft als Eigentuemer und sieht damit jede Zeile jedes Nutzers. Erlaubt
 * ausschliesslich fuer:
 *   - den Anmeldevorgang (dort gibt es noch keinen Nutzerkontext)
 *   - Migrationen, Seed und Cron-Jobs
 *
 * NIEMALS in einer Route verwenden, die Nutzereingaben verarbeitet oder deren
 * Ergebnis an einen Nutzer geht. Wer hier eine ID aus einem Request einsetzt,
 * hebt die gesamte Zugriffskontrolle des Systems auf.
 */
export async function withServiceRole<T>(
  work: (db: Db, client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getServicePool().connect();

  try {
    await client.query("BEGIN");
    const result = await work(drizzle(client, { schema }), client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
