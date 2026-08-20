/**
 * Feste Sitzungen fuer eine Vorfuehrinstanz.
 *
 * Warum das ueberhaupt noetig ist: Anomail kennt nur die Anmeldung per
 * Magic-Link. Ohne eingerichteten Mailversand kommt niemand hinein - auch
 * kein Kunde, der sich die Anwendung nur ansehen soll.
 *
 * Was hier passiert, ist kein zweiter Anmeldeweg. Es wird genau das angelegt,
 * was eine regulaere Anmeldung auch anlegt: eine Zeile in sessions. Wer das
 * Cookie setzt, ist angemeldet - dieselbe Pruefung, dieselbe Rollenlogik,
 * dieselbe Sperrpruefung bei jeder Anfrage.
 *
 * ACHTUNG: Wer den Wert von DEMO_ZUGANG_TOKEN kennt, ist ohne weitere
 * Pruefung als dieser Nutzer angemeldet. Das ist fuer eine Vorfuehrinstanz
 * mit erfundenen Daten vertretbar und fuer eine Instanz mit echten Briefen
 * nicht. Deshalb:
 *
 *   - Laeuft nur, wenn DEMO_ZUGANG ausdruecklich auf "true" steht.
 *   - Verlangt ein Geheimnis von mindestens 24 Zeichen.
 *   - Meldet sich beim Ausrollen deutlich im Protokoll.
 *
 * Zum Abschalten: DEMO_ZUGANG entfernen und einmal neu ausrollen. Das
 * Aufraeumen loescht die Sitzungen dann wieder.
 */
import type { Client } from "pg";

const MINDESTLAENGE = 24;

const KONTEN = [
  {
    email: "demo@anomail.invalid",
    anomailId: "AN-DEMU-4567",
    rolle: "user" as const,
    tokenSuffix: "",
    beschreibung: "Nutzer",
  },
  {
    email: "demo-moderation@anomail.invalid",
    anomailId: "AN-DEMM-5678",
    rolle: "moderator" as const,
    tokenSuffix: "-moderation",
    beschreibung: "Moderation",
  },
];

export type DemoSitzung = {
  beschreibung: string;
  anomailId: string;
  token: string;
};

/**
 * Legt die Vorfuehr-Sitzungen an. Gibt zurueck, was gesetzt werden muss.
 * Mehrfach ausfuehrbar: bestehende Konten und Sitzungen werden aufgefrischt.
 */
export async function richteDemoZugangEin(
  client: Pick<Client, "query">,
  geheimnis: string,
): Promise<DemoSitzung[]> {
  if (geheimnis.length < MINDESTLAENGE) {
    throw new Error(
      `DEMO_ZUGANG_TOKEN ist zu kurz (${geheimnis.length} Zeichen). Mindestens ${MINDESTLAENGE} - ein kurzes Geheimnis laesst sich raten, und wer es hat, ist angemeldet.`,
    );
  }

  const ergebnis: DemoSitzung[] = [];

  for (const konto of KONTEN) {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO users (email, anomail_id, role, email_verified)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
       RETURNING id`,
      [konto.email, konto.anomailId, konto.rolle],
    );

    const token = `${geheimnis}${konto.tokenSuffix}`;

    await client.query(
      `INSERT INTO sessions (session_token, user_id, expires)
       VALUES ($1, $2, now() + interval '90 days')
       ON CONFLICT (session_token)
       DO UPDATE SET expires = EXCLUDED.expires, user_id = EXCLUDED.user_id`,
      [token, rows[0].id],
    );

    ergebnis.push({
      beschreibung: konto.beschreibung,
      anomailId: konto.anomailId,
      token,
    });
  }

  return ergebnis;
}

/**
 * Entfernt die Vorfuehr-Sitzungen wieder.
 *
 * Laeuft bei jedem Ausrollen, bei dem DEMO_ZUGANG nicht gesetzt ist. So
 * genuegt es, die Variable zu entfernen - man muss nicht daran denken, die
 * Sitzungen von Hand aufzuraeumen.
 */
export async function raeumeDemoZugangAuf(
  client: Pick<Client, "query">,
): Promise<number> {
  const { rowCount } = await client.query(
    `DELETE FROM sessions
      WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1::text[]))`,
    [KONTEN.map((konto) => konto.email)],
  );

  return rowCount ?? 0;
}
