import fs from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { bestaetigeFarbmodus, melde, pfadVon } from "./hilfen";
import { ROUTEN } from "./routen";

/**
 * axe-core ueber jede Route, in beiden Farbmodi.
 *
 * Zwei Dinge sind hier bewusst so und nicht anders:
 *
 * 1. Keine Regel ist abgeschaltet. Ein Verstoss wird an der Ursache behoben,
 *    nicht in der Konfiguration stillgestellt.
 * 2. Die Pruefung faellt durch, wenn axe gar nichts findet, weil die Seite
 *    nicht geladen hat. Eine leere Seite hat keine Verstoesse und bestuende
 *    sonst.
 */

for (const route of ROUTEN) {
  const titel = route.intern
    ? `${route.pfad} (${route.zweck}) ist im Produktionsbau nicht erreichbar`
    : `${route.pfad} (${route.zweck}) hat keine axe-Verstoesse`;

  test(titel, async ({ page }) => {
    const pfad = await pfadVon(route);

    await melde(page, route.sitzung);

    const antwort = await page.goto(pfad, { waitUntil: "domcontentloaded" });

    if (route.intern) {
      // Die Entwickleransichten rufen notFound(), sobald NODE_ENV nicht
      // "development" ist. Gegen den Produktionsbau ist 404 also das richtige
      // Ergebnis - und zugleich der Nachweis, dass die Sperre haelt. Eine
      // axe-Pruefung ist hier nicht moeglich; im Abnahmebericht steht das
      // als offene Stelle, nicht als bestanden.
      expect(
        antwort?.status(),
        `${pfad} ist im Produktionsbau erreichbar, obwohl es das nicht sein soll`,
      ).toBe(404);
      return;
    }

    if (route.leitetWeiterNach) {
      // Die Weiterleitung ist selbst Teil der Zusicherung. Und ohne das
      // Abwarten liefe axe in eine Seite, die gerade ausgetauscht wird.
      await page.waitForURL(`**${route.leitetWeiterNach}`);
      await page.waitForLoadState("load");
    }

    // Nur die 404-Route darf 404 liefern.
    const erwarteterStatus = route.zweck === "404-Seite" ? 404 : 200;
    expect(
      antwort?.status(),
      `${pfad} sollte mit ${erwarteterStatus} antworten`,
    ).toBe(erwarteterStatus);

    // Eine geschuetzte Seite, die zur Anmeldung umleitet, waere nicht die
    // Seite, die geprueft werden sollte.
    if (route.sitzung !== "anonym") {
      expect(
        new URL(page.url()).pathname,
        `${pfad} hat zur Anmeldung umgeleitet`,
      ).not.toBe("/login");
    }

    // Nachweis, dass ueberhaupt eine Seite dasteht.
    await expect(page.locator("main")).toBeVisible();

    // Und dass sie in der Helligkeit dasteht, die dieser Durchgang prueft.
    await bestaetigeFarbmodus(page);

    const ergebnis = await new AxeBuilder({ page })
      // Der Umfang, den die harte Vorgabe verlangt: WCAG 2.1 bis AA.
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    // Wenn axe nichts geprueft hat, ist das Ergebnis wertlos, nicht gut.
    expect(
      ergebnis.passes.length,
      `axe hat auf ${pfad} keine einzige Regel angewandt`,
    ).toBeGreaterThan(0);

    const befunde = ergebnis.violations.map((verstoss) => ({
      regel: verstoss.id,
      wirkung: verstoss.impact,
      beschreibung: verstoss.help,
      stellen: verstoss.nodes.map((knoten) => knoten.target.join(" ")),
    }));

    expect(befunde, `axe-Verstoesse auf ${pfad}`).toEqual([]);
  });
}

test("die Routentabelle ist vollstaendig", async () => {
  const wurzel = path.join(process.cwd(), "app");
  const gefunden: string[] = [];

  async function durchlaufe(verzeichnis: string): Promise<void> {
    for (const eintrag of await fs.readdir(verzeichnis, { withFileTypes: true })) {
      const voll = path.join(verzeichnis, eintrag.name);

      if (eintrag.isDirectory()) {
        // Routengruppen und private Ordner erzeugen keinen Pfadabschnitt.
        if (eintrag.name.startsWith("_") || eintrag.name === "api") {
          continue;
        }
        await durchlaufe(voll);
      } else if (eintrag.name === "page.tsx") {
        const pfad = path
          .relative(wurzel, verzeichnis)
          .split(path.sep)
          .filter((teil) => teil.length > 0 && !teil.startsWith("("))
          .join("/");
        gefunden.push(`/${pfad}`);
      }
    }
  }

  await durchlaufe(wurzel);

  // Der dynamische Abschnitt heisst in der Tabelle anders als im Dateisystem.
  const eingetragen = new Set(
    ROUTEN.map((route) => route.pfad.replace("{gespraech}", "[id]")),
  );

  const fehlend = gefunden.filter((pfad) => !eingetragen.has(pfad));

  expect(
    fehlend,
    "Diese Routen sind nicht in tests/e2e/routen.ts eingetragen und werden nicht geprueft",
  ).toEqual([]);
});
