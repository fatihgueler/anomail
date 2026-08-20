/**
 * Prueft, ob ein Vorfuehr-Zugang wirklich anmeldet.
 *
 * Zugangsdaten herauszugeben, ohne sie ausprobiert zu haben, waere geraten.
 * Das Skript ruft zwei geschuetzte Seiten mit dem Cookie auf und meldet, ob
 * sie erreichbar sind oder zur Anmeldung umleiten.
 *
 * Aufruf:  npx tsx scripts/pruefe-demo-zugang.mts <basis-url> <token>
 */
import { chromium } from "@playwright/test";

const [basis, token] = process.argv.slice(2);

if (!basis || !token) {
  console.error(
    "Aufruf: npx tsx scripts/pruefe-demo-zugang.mts <basis-url> <token>",
  );
  process.exit(1);
}

const PRUEFUNGEN = [
  { pfad: "/my-letters", suffix: "", erwartet: "Nutzer" },
  { pfad: "/moderation/reports", suffix: "-moderation", erwartet: "Moderation" },
];

const browser = await chromium.launch();
let alleGut = true;

try {
  for (const pruefung of PRUEFUNGEN) {
    const context = await browser.newContext();

    await context.addCookies([
      {
        name: "authjs.session-token",
        value: `${token}${pruefung.suffix}`,
        domain: new URL(basis).hostname,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        secure: basis.startsWith("https"),
      },
    ]);

    const page = await context.newPage();
    await page.goto(`${basis}${pruefung.pfad}`, { waitUntil: "domcontentloaded" });

    const gelandet = new URL(page.url()).pathname;
    const angemeldet = !gelandet.startsWith("/login");

    console.log(
      `${angemeldet ? "OK  " : "FEHL"}  ${pruefung.erwartet.padEnd(12)} ${pruefung.pfad} -> ${gelandet}`,
    );

    if (!angemeldet) {
      alleGut = false;
    }

    await context.close();
  }
} finally {
  await browser.close();
}

process.exit(alleGut ? 0 : 1);
