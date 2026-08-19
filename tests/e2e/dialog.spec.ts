import { expect, test, type Page } from "@playwright/test";

import { oeffne } from "./hilfen";
import { ROUTEN } from "./routen";

/**
 * Dialogverhalten.
 *
 * Ein Dialog muss drei Dinge einhalten: den Fokus beim Oeffnen hineinnehmen,
 * ihn waehrend der Anzeige nicht nach draussen entkommen lassen und ihn beim
 * Schliessen dorthin zuruecklegen, wo er herkam. Faellt das dritte weg, landet
 * die Tastatur am Seitenanfang und der Weg zurueck ist verloren.
 *
 * Radix setzt aria-modal nicht selbst, und bei einem gesteuerten Dialog ohne
 * DialogTrigger zeigt seine Fokusrueckgabe ins Leere. Beides ist in
 * components/ui/dialog.tsx nachgeruestet - hier steht der Nachweis, dass es
 * wirkt.
 */

type Fall = {
  /** Pfad aus der Routentabelle. */
  route: string;
  /** Beschriftung des Knopfs, der den Dialog oeffnet. */
  oeffner: string;
  zweck: string;
  /** Schritte, die noetig sind, bevor der Knopf bedienbar ist. */
  vorbereiten?: (page: Page) => Promise<void>;
};

const FAELLE: Fall[] = [
  { route: "/my-letters", oeffner: "Brief löschen", zweck: "Brief loeschen" },
  {
    route: "/delete-account",
    oeffner: "Konto löschen",
    zweck: "Konto loeschen",
    // Der Knopf ist gesperrt, bis die Bestaetigung gesetzt ist.
    vorbereiten: async (page) => {
      await page.getByRole("checkbox").check();
    },
  },
];

async function oeffneRoute(page: Page, pfad: string): Promise<void> {
  const route = ROUTEN.find((eintrag) => eintrag.pfad === pfad);

  if (!route) {
    throw new Error(`${pfad} steht nicht in der Routentabelle.`);
  }

  await oeffne(page, route);
}

for (const fall of FAELLE) {
  test.describe(`${fall.route}: ${fall.zweck}`, () => {
    test("nimmt den Fokus auf und gibt ihn beim Schliessen zurueck", async ({
      page,
    }) => {
      await oeffneRoute(page, fall.route);
      await fall.vorbereiten?.(page);

      const ausloeser = page.getByRole("button", { name: fall.oeffner }).first();
      await expect(ausloeser).toBeVisible();
      await ausloeser.focus();

      const vorher = await page.evaluate(
        () => document.activeElement?.textContent?.trim() ?? null,
      );

      await ausloeser.press("Enter");

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute("aria-modal", "true");

      // Der Fokus muss im Dialog liegen, nicht dahinter.
      const imDialog = await page.evaluate(() => {
        const dialogElement = document.querySelector('[role="dialog"]');
        return dialogElement?.contains(document.activeElement) ?? false;
      });
      expect(imDialog, "Der Fokus liegt nicht im Dialog").toBe(true);

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();

      const nachher = await page.evaluate(
        () => document.activeElement?.textContent?.trim() ?? null,
      );

      expect(nachher, "Der Fokus kam nicht zum Ausloeser zurueck").toBe(vorher);
    });

    test("laesst den Fokus nicht aus dem Dialog heraus", async ({ page }) => {
      await oeffneRoute(page, fall.route);
      await fall.vorbereiten?.(page);

      const ausloeser = page.getByRole("button", { name: fall.oeffner }).first();
      await ausloeser.focus();
      await ausloeser.press("Enter");

      await expect(page.getByRole("dialog")).toBeVisible();

      // Genug Schritte, um einmal ganz herum und darueber hinaus zu kommen.
      for (let schritt = 0; schritt < 12; schritt += 1) {
        await page.keyboard.press("Tab");

        const drin = await page.evaluate(() => {
          const dialogElement = document.querySelector('[role="dialog"]');
          return dialogElement?.contains(document.activeElement) ?? false;
        });

        expect(drin, `Nach ${schritt + 1} Schritten war der Fokus draussen`).toBe(
          true,
        );
      }
    });
  });
}
