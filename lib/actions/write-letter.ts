import "server-only";

import { and, eq, gt, inArray, sql } from "drizzle-orm";

import { categories, letters } from "@/db/schema";
import { checkContentSafety, type SafetyProvider } from "@/lib/safety";
import { withServiceRole, withUser, type Db } from "@/lib/db/client";

/**
 * Der Absendevorgang.
 *
 * Bewusst getrennt von der Server Action in app/write: hier steht die
 * Reihenfolge und die Entscheidung, dort nur die Anbindung an das Formular.
 * So laesst sich der Ablauf im Test aufrufen, ohne Next.js zu starten.
 */

/** Untergrenze. Kuerzer laesst sich nichts beantworten. */
export const LETTER_MIN_LENGTH = 80;

/** Obergrenze. */
export const LETTER_MAX_LENGTH = 4000;

/** Die acht erlaubten Kategorien. Andere Slugs weist die Aktion ab. */
export const ALLOWED_CATEGORY_SLUGS = [
  "beziehung",
  "familie",
  "einsamkeit",
  "arbeit",
  "schule",
  "hoffnung",
  "persoenliches",
  "sonstiges",
] as const;

export type CategorySlug = (typeof ALLOWED_CATEGORY_SLUGS)[number];

/** Ohne Auswahl wird serverseitig diese Kategorie gesetzt. */
export const DEFAULT_CATEGORY_SLUG: CategorySlug = "sonstiges";

/**
 * Ratenbegrenzung pro Nutzer.
 *
 * Gezaehlt werden die tatsaechlich entstandenen Briefe im Zeitfenster, nicht
 * die Versuche. Das braucht keine zusaetzliche Tabelle, ist genau das, was
 * begrenzt werden soll, und laeuft ueber den vorhandenen Index auf
 * letters(author_id).
 */
export const LETTERS_PER_WINDOW = 5;
export const RATE_WINDOW_MINUTES = 60;

export type SubmitInput = {
  content: string;
  categorySlugs: string[];
  submissionId: string;
};

export type SubmitResult =
  | {
      status: "ok";
      letterId: string;
      showCrisisNotice: boolean;
      /** Wahr, wenn derselbe Absendevorgang schon einen Brief erzeugt hatte. */
      duplicate: boolean;
    }
  | {
      status: "invalid";
      field: "content" | "categories" | "submission";
      message: string;
    }
  | { status: "rate-limited"; retryAfterMinutes: number; message: string }
  | { status: "failed"; message: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isAllowedSlug(value: string): value is CategorySlug {
  return (ALLOWED_CATEGORY_SLUGS as readonly string[]).includes(value);
}

/**
 * Fuehrt den Absendevorgang aus.
 *
 * Reihenfolge: Kontext, Eingabe, Pruefung, Anlegen. Das Anlegen von Brief,
 * Kategorien und Pruefprotokoll passiert in einem einzigen Aufruf von
 * create_letter() und damit in einer Transaktion.
 */
export async function submitLetter(
  session: { user?: { id?: string | null; isBanned?: boolean | null } | null } | null,
  input: SubmitInput,
  options: { safetyProvider?: SafetyProvider; safetyTimeoutMs?: number } = {},
): Promise<SubmitResult> {
  // 1. Kontext. Der Guard der Route faengt den Regelfall ab; diese Pruefung
  //    haelt auch, wenn die Aktion direkt aufgerufen wird.
  const userId = session?.user?.id;

  if (!userId) {
    return {
      status: "failed",
      message:
        "Du bist nicht mehr angemeldet. Melde dich neu an, dein Text bleibt im Feld stehen.",
    };
  }

  if (session?.user?.isBanned) {
    return {
      status: "failed",
      message:
        "Dein Konto ist gesperrt. Du kannst gerade keine Briefe schreiben.",
    };
  }

  // 2. Eingabe. Die Grenzen aus dem Browser sind fuer die Rueckmeldung da,
  //    nicht fuer die Entscheidung - hier wird alles erneut geprueft.
  const content = input.content.trim();

  if (content.length < LETTER_MIN_LENGTH) {
    return {
      status: "invalid",
      field: "content",
      message: `Dein Brief ist zu kurz. Schreib mindestens ${LETTER_MIN_LENGTH} Zeichen, damit jemand darauf antworten kann.`,
    };
  }

  if (content.length > LETTER_MAX_LENGTH) {
    return {
      status: "invalid",
      field: "content",
      message: `Dein Brief ist zu lang. Kürze ihn auf höchstens ${LETTER_MAX_LENGTH} Zeichen.`,
    };
  }

  if (!UUID_PATTERN.test(input.submissionId)) {
    return {
      status: "invalid",
      field: "submission",
      message:
        "Das Formular ist abgelaufen. Lade die Seite neu und schick den Brief noch einmal ab.",
    };
  }

  const requested = [...new Set(input.categorySlugs)];
  const unknown = requested.filter((slug) => !isAllowedSlug(slug));

  if (unknown.length > 0) {
    return {
      status: "invalid",
      field: "categories",
      message:
        "Mindestens eine gewählte Kategorie gibt es nicht. Lade die Seite neu und wähl erneut.",
    };
  }

  const slugs: CategorySlug[] =
    requested.length > 0
      ? (requested as CategorySlug[])
      : [DEFAULT_CATEGORY_SLUG];

  // 3. Pruefung. Liefert immer ein Ergebnis, auch bei Ausfall des Anbieters.
  const verdict = await checkContentSafety(
    { content, targetType: "letter" },
    { provider: options.safetyProvider, timeoutMs: options.safetyTimeoutMs },
  );

  try {
    return await withUser({ user: { id: userId } }, async (db, client) => {
      // Ratenbegrenzung innerhalb derselben Transaktion, damit zwischen
      // Zaehlen und Anlegen nichts dazwischenkommt.
      const limited = await isRateLimited(db, userId, input.submissionId);

      if (limited) {
        return {
          status: "rate-limited" as const,
          retryAfterMinutes: RATE_WINDOW_MINUTES,
          message: `Du hast in der letzten Stunde ${LETTERS_PER_WINDOW} Briefe geschrieben. Warte etwa eine Stunde, dann geht es weiter.`,
        };
      }

      const categoryIds = await resolveCategoryIds(db, slugs);

      if (categoryIds.length !== slugs.length) {
        return {
          status: "invalid" as const,
          field: "categories" as const,
          message:
            "Mindestens eine gewählte Kategorie gibt es nicht. Lade die Seite neu und wähl erneut.",
        };
      }

      // Ob der Brief vorher schon existierte, entscheidet ueber die Meldung
      // an den Nutzer und daruber, ob ein zweites Pruefprotokoll entstanden
      // ist. Deshalb vorher nachsehen.
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM letters WHERE submission_id = $1`,
        [input.submissionId],
      );

      // 4. + 5. Brief, Kategorien und Pruefprotokoll in einem Schritt.
      const created = await client.query<{ id: string; status: string }>(
        `SELECT id, status FROM create_letter($1, $2::uuid[], $3::uuid, $4::risk_level, $5, $6::text[], $7, $8)`,
        [
          content,
          categoryIds,
          input.submissionId,
          verdict.riskLevel,
          verdict.shouldHold,
          verdict.detectedCategories,
          verdict.reasoning,
          content,
        ],
      );

      const row = created.rows[0];

      if (!row?.id) {
        throw new Error("create_letter lieferte keinen Brief zurueck.");
      }

      return {
        status: "ok" as const,
        letterId: row.id,
        showCrisisNotice: verdict.showCrisisNotice,
        duplicate: (existing.rowCount ?? 0) > 0,
      };
    });
  } catch (error) {
    console.error(
      "[write] Brief konnte nicht angelegt werden",
      JSON.stringify({
        userId,
        submissionId: input.submissionId,
        riskLevel: verdict.riskLevel,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    // Die Pruefung lief bereits. Damit der Aufruf nicht verloren geht, wird er
    // ohne Briefbezug protokolliert - sonst fehlte in der Moderation genau die
    // Zeile zu einem Vorgang, der schiefging.
    await recordOrphanSafetyCheck(userId, content, verdict).catch(
      (logError: unknown) => {
        console.error("[write] Pruefprotokoll nicht schreibbar", logError);
      },
    );

    return {
      status: "failed",
      message:
        "Dein Brief konnte nicht gespeichert werden. Dein Text steht noch im Feld — versuch es gleich noch einmal.",
    };
  }
}

async function isRateLimited(
  db: Db,
  userId: string,
  submissionId: string,
): Promise<boolean> {
  // Der eigene, schon vorhandene Absendevorgang zaehlt nicht mit. Sonst
  // liefe ein wiederholtes Absenden gegen die Grenze, obwohl es keinen
  // zweiten Brief erzeugt.
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(letters)
    .where(
      and(
        eq(letters.authorId, userId),
        gt(
          letters.createdAt,
          sql`now() - (${RATE_WINDOW_MINUTES}::int * interval '1 minute')`,
        ),
        sql`(${letters.submissionId} IS NULL OR ${letters.submissionId} <> ${submissionId}::uuid)`,
      ),
    );

  return (rows[0]?.count ?? 0) >= LETTERS_PER_WINDOW;
}

async function resolveCategoryIds(
  db: Db,
  slugs: CategorySlug[],
): Promise<string[]> {
  // inArray statt einer selbstgebauten ANY-Bedingung: Drizzle reicht ein
  // JS-Array sonst als einzelnen Parameter durch, den PostgreSQL nicht als
  // Array liest.
  const rows = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories)
    .where(inArray(categories.slug, slugs));

  return rows.map((row) => row.id);
}

/**
 * Protokolliert eine Pruefung, zu der kein Brief entstanden ist.
 *
 * Laeuft ueber die Dienstverbindung, weil safety_checks der Moderation
 * vorbehalten ist. Es wird ausschliesslich geschrieben, nie gelesen, und die
 * Nutzerkennung stammt aus der Session, nicht aus einer Eingabe.
 */
async function recordOrphanSafetyCheck(
  userId: string,
  content: string,
  verdict: Awaited<ReturnType<typeof checkContentSafety>>,
): Promise<void> {
  await withServiceRole(async (_db, client) => {
    await client.query(
      `INSERT INTO safety_checks (
         target_type, target_id, sender_id, content_snapshot,
         risk_level, detected_categories, should_hold, reasoning,
         moderation_status, actions
       ) VALUES ('letter', NULL, $1, $2, $3::risk_level, $4::text[], $5, $6, 'open', '[]'::jsonb)`,
      [
        userId,
        content,
        verdict.riskLevel,
        verdict.detectedCategories,
        verdict.shouldHold,
        `${verdict.reasoning} | Brief konnte nicht angelegt werden.`,
      ],
    );
  });
}
