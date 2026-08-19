import fs from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

import type { Route, Sitzung } from "./routen";

/** Gemeinsame Hilfen der Barrierefreiheitspruefungen. */

const SITZUNGSCOOKIE = "authjs.session-token";

/**
 * Die Kennungen stammen aus scripts/local-dev-db.mts. Sie gelten nur fuer die
 * lokale Entwicklungsdatenbank; im Betrieb gibt es keine festen Sitzungen.
 */
const TOKEN: Record<Exclude<Sitzung, "anonym">, string> = {
  nutzer: "local-dev-session-token",
  moderation: "local-dev-moderator-token",
};

let gespraechsId: string | undefined;

/**
 * Die Gespraechs-ID entsteht beim Anlegen der Entwicklungsdatenbank und steht
 * deshalb nicht in der Routentabelle. Sie wird einmal je Prozess gelesen.
 */
export async function leseGespraechsId(): Promise<string> {
  if (gespraechsId) {
    return gespraechsId;
  }

  const env = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
  const treffer = env.match(/^DATABASE_URL=(.+)$/m);

  if (!treffer) {
    throw new Error(
      "DATABASE_URL fehlt in .env.local. Zuerst 'npx tsx scripts/local-dev-db.mts' starten.",
    );
  }

  const client = new Client({ connectionString: treffer[1].trim() });
  await client.connect();

  try {
    const { rows } = await client.query<{ id: string }>(
      `SELECT c.id
         FROM conversations c
         JOIN users u ON u.id = c.participant_a_id
        WHERE u.email = 'du@example.test'
        ORDER BY c.created_at
        LIMIT 1`,
    );

    if (!rows[0]) {
      throw new Error(
        "Kein Gespraech in der Entwicklungsdatenbank. Die Beispieldaten fehlen.",
      );
    }

    gespraechsId = rows[0].id;
    return gespraechsId;
  } finally {
    await client.end();
  }
}

/** Setzt das Sitzungscookie, ohne den Magic-Link zu durchlaufen. */
export async function melde(page: Page, sitzung: Sitzung): Promise<void> {
  if (sitzung === "anonym") {
    return;
  }

  const basis = new URL(
    test.info().project.use.baseURL ?? "http://localhost:3000",
  );

  await page.context().addCookies([
    {
      name: SITZUNGSCOOKIE,
      value: TOKEN[sitzung],
      domain: basis.hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

/**
 * Wartet, bis die Helligkeit gesetzt ist, und belegt, dass es die erwartete
 * ist.
 *
 * Das Skript im <head> setzt die Klasse vor dem ersten Zeichnen, der
 * ThemeProvider bestaetigt sie danach. Wer sofort nach dem Laden misst, trifft
 * unter Umstaenden noch den hellen Ausgangswert - und ein Durchgang, der sich
 * "dunkel" nennt, haette in Wahrheit die helle Oberflaeche geprueft. Genau
 * dieser Fehlschluss soll hier nicht moeglich sein.
 */
export async function bestaetigeFarbmodus(page: Page): Promise<void> {
  const erwartet =
    test.info().project.use.colorScheme === "dark" ? "dark" : "light";

  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${erwartet}\\b`));
}

/** WCAG 2.5.5: 44x44 CSS-Pixel. Die harte Vorgabe des Projekts ebenso. */
export const MINDESTZIEL = 44;

/**
 * Eine Ausnahme, die WCAG selbst kennt: ein Bedienelement im Fliesstext.
 * Ein Link mitten in einem Satz auf 44px zu bringen, zerrisse den Absatz.
 */
const AUSNAHME_IM_FLIESSTEXT = "inline";

export type Zielbefunde = { zuKlein: string[]; ohneRing: string[] };

/**
 * Misst jedes Bedienelement der aktuellen Seite.
 *
 * Gemessen wird die Flaeche, die den Zeiger tatsaechlich annimmt - nicht das
 * Kaestchen des Elements. Ein Kontrollkaestchen ist 16x16 gross, liegt aber in
 * einem <label>, und ein Klick auf das Label schaltet es; das Label ist das
 * Ziel. Ein Schalter erweitert seine Flaeche ueber ein absolut gesetztes
 * ::before mit negativem inset.
 *
 * Beides mitzuzaehlen ist keine Lockerung, sondern die Definition: WCAG 2.5.5
 * misst den Bereich, der die Zeigeraktion entgegennimmt. Gezaehlt wird jeweils
 * ein zusammenhaengender Bereich, nie die Summe mehrerer. Dass die Messung
 * wirklich noch etwas findet, weist bedienung.spec.ts mit einem absichtlich
 * zu kleinen Ziel nach.
 */
export async function messeBedienelemente(page: Page): Promise<Zielbefunde> {
  return page.evaluate(
    ({ mindestziel, ausnahme }) => {
      function zielflaechen(el: HTMLElement): DOMRect[] {
        const flaechen: DOMRect[] = [];
        const eigen = el.getBoundingClientRect();

        let oben = eigen.top;
        let links = eigen.left;
        let unten = eigen.bottom;
        let rechts = eigen.right;

        for (const pseudo of ["::before", "::after"]) {
          const stil = getComputedStyle(el, pseudo);

          if (stil.content === "none" || stil.position !== "absolute") {
            continue;
          }

          // Negative inset-Werte vergroessern die Flaeche.
          const wert = (name: string) => {
            const zahl = parseFloat(stil.getPropertyValue(name));
            return Number.isFinite(zahl) ? zahl : 0;
          };

          oben = Math.min(oben, eigen.top + wert("top"));
          links = Math.min(links, eigen.left + wert("left"));
          unten = Math.max(unten, eigen.bottom - wert("bottom"));
          rechts = Math.max(rechts, eigen.right - wert("right"));
        }

        flaechen.push(new DOMRect(links, oben, rechts - links, unten - oben));

        const id = el.getAttribute("id");
        const label =
          el.closest("label") ??
          (id
            ? document.querySelector<HTMLLabelElement>(
                `label[for="${CSS.escape(id)}"]`,
              )
            : null);

        if (label) {
          flaechen.push(label.getBoundingClientRect());
        }

        return flaechen;
      }

      const bedienbar = [
        ...document.querySelectorAll<HTMLElement>(
          'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ];

      const zuKlein: string[] = [];
      const ohneRing: string[] = [];

      for (const el of bedienbar) {
        const r = el.getBoundingClientRect();

        if (r.width === 0 || r.height === 0) {
          // Nicht dargestellt - etwa die Sprunglinie vor dem Fokus.
          continue;
        }

        const stil = getComputedStyle(el);
        const beschreibung = `${el.tagName.toLowerCase()} "${(
          el.textContent ?? ""
        )
          .trim()
          .slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`;

        const grossGenug = zielflaechen(el).some(
          (flaeche) =>
            flaeche.width >= mindestziel && flaeche.height >= mindestziel,
        );

        if (!stil.display.includes(ausnahme) && !grossGenug) {
          zuKlein.push(beschreibung);
        }

        el.focus();
        const fokussiert = getComputedStyle(el);
        const hatRing =
          fokussiert.outlineStyle !== "none" &&
          parseFloat(fokussiert.outlineWidth) > 0;

        if (document.activeElement === el && !hatRing) {
          ohneRing.push(beschreibung);
        }
      }

      return { zuKlein, ohneRing };
    },
    { mindestziel: MINDESTZIEL, ausnahme: AUSNAHME_IM_FLIESSTEXT },
  );
}

/** Loest den Platzhalter der dynamischen Route auf. */
export async function pfadVon(route: Route): Promise<string> {
  return route.pfad.includes("{gespraech}")
    ? route.pfad.replace("{gespraech}", await leseGespraechsId())
    : route.pfad;
}

/**
 * Ruft eine Route auf und stellt sicher, dass die erwartete Seite dasteht.
 * Gibt false zurueck, wenn die Route im Produktionsbau nicht existiert.
 */
export async function oeffne(page: Page, route: Route): Promise<boolean> {
  await melde(page, route.sitzung);

  const antwort = await page.goto(await pfadVon(route), {
    waitUntil: "domcontentloaded",
  });

  if (route.intern) {
    return false;
  }

  if (route.leitetWeiterNach) {
    await page.waitForURL(`**${route.leitetWeiterNach}`);
    await page.waitForLoadState("load");
  }

  const erwarteterStatus = route.zweck === "404-Seite" ? 404 : 200;
  expect(antwort?.status(), `${route.pfad} antwortet unerwartet`).toBe(
    erwarteterStatus,
  );

  await expect(page.locator("main#hauptinhalt")).toBeVisible();
  await bestaetigeFarbmodus(page);

  return true;
}
