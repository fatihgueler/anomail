/**
 * Bildschirmfotos zur Kontrolle.
 *
 * Nimmt jede angegebene Route in Desktop- und Mobilbreite auf, in beiden
 * Helligkeiten. Gedacht fuer die Gestaltungsarbeit: nach jedem groesseren
 * Schritt einmal laufen lassen und nachsehen, statt zu raten.
 *
 * Die Aufnahmen landen unter .screenshots/ und sind von git ausgenommen.
 *
 * Voraussetzung: der Entwicklungsserver laeuft auf Port 3000 und die lokale
 * Datenbank steht.
 *
 * Aufruf:  npx tsx scripts/screenshots.mts [route ...]
 */
import fs from "node:fs/promises";
import path from "node:path";

import { chromium, type Page } from "@playwright/test";

const BASIS = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const ZIEL = path.join(process.cwd(), ".screenshots");
const SITZUNG = "local-dev-session-token";

const ROUTEN = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ["/"];

const BREITEN = [
  { name: "desktop", breite: 1440, hoehe: 900 },
  { name: "mobil", breite: 390, hoehe: 844 },
];

const MODI: Array<"light" | "dark"> = ["light", "dark"];

/** Wartet, bis alle Einblendungen durch sind. */
async function alleEingeblendet(page: Page): Promise<void> {
  // Einmal ganz durchscrollen, damit jeder IntersectionObserver ausloest.
  await page.evaluate(async () => {
    const schritt = window.innerHeight * 0.8;

    for (let y = 0; y < document.body.scrollHeight; y += schritt) {
      window.scrollTo(0, y);
      await new Promise((fertig) => setTimeout(fertig, 120));
    }

    window.scrollTo(0, 0);
  });

  await page.waitForTimeout(600);
}

await fs.mkdir(ZIEL, { recursive: true });

const browser = await chromium.launch();

try {
  for (const modus of MODI) {
    for (const format of BREITEN) {
      const context = await browser.newContext({
        viewport: { width: format.breite, height: format.hoehe },
        colorScheme: modus,
        deviceScaleFactor: 2,
      });

      await context.addCookies([
        {
          /*
           * Ueber HTTPS traegt das Sitzungscookie von Auth.js das Praefix
           * "__Secure-". Ohne diese Fallunterscheidung landen Aufnahmen einer
           * ausgerollten Instanz stumm im abgemeldeten Zustand.
           */
          name: BASIS.startsWith("https")
            ? "__Secure-authjs.session-token"
            : "authjs.session-token",
          value: SITZUNG,
          domain: new URL(BASIS).hostname,
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);

      const page = await context.newPage();

      for (const route of ROUTEN) {
        await page.goto(`${BASIS}${route}`, { waitUntil: "networkidle" });
        await alleEingeblendet(page);

        const name = route === "/" ? "start" : route.replace(/\//g, "-").slice(1);
        const datei = path.join(ZIEL, `${name}--${format.name}--${modus}.png`);

        await page.screenshot({ path: datei, fullPage: true });
        console.log(path.relative(process.cwd(), datei));
      }

      await context.close();
    }
  }
} finally {
  await browser.close();
}
