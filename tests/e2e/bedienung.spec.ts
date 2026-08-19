import { expect, test } from "@playwright/test";

import { MINDESTZIEL, messeBedienelemente, oeffne } from "./hilfen";
import { ROUTEN } from "./routen";

/**
 * Die Kriterien des manuellen Durchgangs, dauerhaft geprueft.
 *
 * axe findet Auszeichnungsfehler. Ob eine Seite bei 200% Zoom noch ohne
 * Querlauf lesbar ist, ob jedes Ziel gross genug ist und ob der Fokus zu sehen
 * bleibt, findet es nicht. Diese Suite haelt genau das fest, was sonst nur
 * einmal von Hand geprueft und beim naechsten Umbau wieder verloren waere.
 */

test("die Zielmessung meldet ein zu kleines Ziel auch wirklich", async ({
  page,
}) => {
  // Die Messung zaehlt Pseudoelemente und zugehoerige Labels mit. Ohne diesen
  // Gegenbeweis koennte sie unbemerkt alles durchwinken und jede folgende
  // Pruefung bestuende aus dem falschen Grund.
  await page.goto("/");
  // Erst nach der Hydrierung einfuegen. React gleicht den Baum sonst noch
  // einmal ab und raeumt das eingefuegte Element weg, bevor gemessen wird -
  // der Test bestuende dann, weil er nichts findet, statt weil nichts da ist.
  await page.waitForLoadState("networkidle");

  await page.evaluate(() => {
    const knopf = document.createElement("button");
    knopf.type = "button";
    knopf.textContent = "zu klein";
    knopf.style.cssText =
      "width:20px;height:20px;display:block;overflow:hidden;outline:none";
    document.querySelector("main")?.append(knopf);
  });

  const befunde = await messeBedienelemente(page);

  expect(befunde.zuKlein.join(" ")).toContain("20x20");
});

for (const route of ROUTEN.filter((r) => !r.intern)) {
  test.describe(`${route.pfad} (${route.zweck})`, () => {
    test("laeuft bei 200% Zoom nicht waagerecht ueber", async ({ page }) => {
      // 200% Zoom auf einem 1280er Bildschirm entspricht 640 CSS-Pixeln
      // Breite. WCAG 1.4.10 verlangt Umbruch statt Querlauf.
      await page.setViewportSize({ width: 640, height: 512 });

      if (!(await oeffne(page, route))) {
        return;
      }

      const befund = await page.evaluate(() => {
        const de = document.documentElement;

        const ueberlaeufer = [...document.querySelectorAll("body *")]
          .filter((el) => {
            const r = el.getBoundingClientRect();

            if (r.width === 0 || r.height === 0) {
              return false;
            }

            // Ein eigener waagerechter Rollbereich ist erlaubt: eine breite
            // Tabelle darf in sich rollen, solange die Seite es nicht tut.
            let vorfahr: Element | null = el.parentElement;
            while (vorfahr) {
              const stil = getComputedStyle(vorfahr);
              if (stil.overflowX === "auto" || stil.overflowX === "scroll") {
                return false;
              }
              vorfahr = vorfahr.parentElement;
            }

            return r.right > de.clientWidth + 1;
          })
          .slice(0, 10)
          .map((el) => {
            const r = el.getBoundingClientRect();
            return `${el.tagName.toLowerCase()} bis ${Math.round(r.right)}px`;
          });

        return {
          scrollBreite: de.scrollWidth,
          sichtbareBreite: de.clientWidth,
          ueberlaeufer,
        };
      });

      expect(befund.ueberlaeufer, "Elemente ragen ueber den Rand hinaus").toEqual(
        [],
      );
      expect(befund.scrollBreite).toBeLessThanOrEqual(befund.sichtbareBreite + 1);
    });

    test("laeuft auf 320px Breite nicht waagerecht ueber", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });

      if (!(await oeffne(page, route))) {
        return;
      }

      const de = await page.evaluate(() => {
        const wurzel = document.documentElement;

        const ueberlaeufer = [...document.querySelectorAll("body *")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.right > wurzel.clientWidth + 1;
          })
          .slice(0, 10)
          .map((el) => {
            const r = el.getBoundingClientRect();
            const klassen =
              typeof el.className === "string" ? el.className.slice(0, 80) : "";
            return `${el.tagName.toLowerCase()}.${klassen} bis ${Math.round(r.right)}px`;
          });

        return {
          scroll: wurzel.scrollWidth,
          sichtbar: wurzel.clientWidth,
          ueberlaeufer,
        };
      });

      expect(de.ueberlaeufer, "Elemente ragen ueber 320px hinaus").toEqual([]);
      expect(de.scroll).toBeLessThanOrEqual(de.sichtbar + 1);
    });

    test("jedes Bedienelement ist gross genug und zeigt den Fokus", async ({
      page,
    }) => {
      if (!(await oeffne(page, route))) {
        return;
      }

      const befunde = await messeBedienelemente(page);

      expect(befunde.zuKlein, "Ziele unter 44x44 Pixeln").toEqual([]);
      expect(befunde.ohneRing, "Fokus ohne sichtbaren Ring").toEqual([]);
    });

    test("Links im Fliesstext heben sich nicht nur durch Farbe ab", async ({
      page,
    }) => {
      if (!(await oeffne(page, route))) {
        return;
      }

      // WCAG 1.4.1, Stufe A. axe prueft das nicht, weil sich maschinell nicht
      // entscheiden laesst, was "nur Farbe" bedeutet. Der Graustufentest von
      // Hand findet es sofort - deshalb hier als Regel statt als Erinnerung.
      const nurFarbe = await page.evaluate(() => {
        const befunde: string[] = [];

        for (const a of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
          const eltern = a.parentElement;

          if (!eltern) {
            continue;
          }

          const stil = getComputedStyle(a);

          // Nur Links mitten im Text. Ein Link, der allein in seinem Absatz
          // steht, ist schon durch seine Stellung als Bedienelement erkennbar.
          const stehtImText =
            stil.display.includes("inline") &&
            eltern.textContent !== null &&
            eltern.textContent.trim() !== (a.textContent ?? "").trim();

          if (!stehtImText) {
            continue;
          }

          const elternStil = getComputedStyle(eltern);

          const unterstrichen = stil.textDecorationLine.includes("underline");
          const andersGewichtet = stil.fontWeight !== elternStil.fontWeight;

          if (!unterstrichen && !andersGewichtet) {
            befunde.push(
              `"${(a.textContent ?? "").trim().slice(0, 40)}" nur farblich abgesetzt`,
            );
          }
        }

        return befunde;
      });

      expect(nurFarbe, "Links, die sich allein durch Farbe abheben").toEqual([]);
    });

    test("die Sprunglinie ist der erste Halt und fuehrt zum Hauptinhalt", async ({
      page,
    }) => {
      if (!(await oeffne(page, route))) {
        return;
      }

      await page.keyboard.press("Tab");

      // Die Sprunglinie faehrt ein, statt zu springen. Wer sofort misst,
      // trifft sie auf halbem Weg und haelt sie faelschlich fuer verborgen.
      await page
        .locator("a[href='#hauptinhalt']")
        .evaluate((el) =>
          Promise.race([
            new Promise((fertig) =>
              el.addEventListener("transitionend", fertig, { once: true }),
            ),
            // Bei prefers-reduced-motion gibt es keinen Uebergang und damit
            // auch kein Ereignis.
            new Promise((fertig) => setTimeout(fertig, 500)),
          ]),
        );

      const erster = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;

        if (!el) {
          return null;
        }

        const r = el.getBoundingClientRect();

        return {
          text: (el.textContent ?? "").trim(),
          ziel: el.getAttribute("href"),
          // Die Sprunglinie liegt bis zum Fokus ausserhalb des Bildes. Beim
          // Fokus muss sie sichtbar werden, sonst hilft sie niemandem.
          sichtbar: r.top >= 0 && r.left >= 0 && r.height > 0,
          hoehe: Math.round(r.height),
        };
      });

      expect(erster?.text).toBe("Zum Hauptinhalt springen");
      expect(erster?.ziel).toBe("#hauptinhalt");
      expect(erster?.sichtbar, "Die Sprunglinie bleibt beim Fokus verborgen").toBe(
        true,
      );
      expect(erster?.hoehe).toBeGreaterThanOrEqual(MINDESTZIEL);

      // Das Ziel muss es auch geben.
      await expect(page.locator("#hauptinhalt")).toHaveCount(1);
    });
  });
}
