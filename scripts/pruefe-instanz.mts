/**
 * Prueft eine laufende Instanz von aussen.
 *
 * Ruft die wichtigsten Routen auf und meldet Statuscode, Titel und Fehler aus
 * der Browserkonsole. Gedacht fuer die Frage "laeuft der Deploy wirklich?" -
 * ein gruenes "Online" beim Anbieter beantwortet die naemlich nicht.
 *
 * Aufruf:  npx tsx scripts/pruefe-instanz.mts <basis-url> [token]
 */
import { chromium } from "@playwright/test";

const [basis, token] = process.argv.slice(2);

if (!basis) {
  console.error("Aufruf: npx tsx scripts/pruefe-instanz.mts <basis-url> [token]");
  process.exit(1);
}

const OEFFENTLICH = ["/", "/login", "/help", "/impressum", "/privacy", "/terms"];
const GESCHUETZT = ["/write", "/listen", "/my-letters", "/settings"];

function cookieName(url: string): string {
  return url.startsWith("https")
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

const browser = await chromium.launch();
let fehlerhaft = 0;

try {
  const context = await browser.newContext();

  if (token) {
    await context.addCookies([
      {
        name: cookieName(basis),
        value: token,
        domain: new URL(basis).hostname,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        secure: basis.startsWith("https"),
      },
    ]);
  }

  const page = await context.newPage();

  const konsolenfehler: string[] = [];
  page.on("console", (nachricht) => {
    if (nachricht.type() === "error") {
      konsolenfehler.push(nachricht.text().slice(0, 160));
    }
  });

  const routen = token ? [...OEFFENTLICH, ...GESCHUETZT] : OEFFENTLICH;

  for (const route of routen) {
    konsolenfehler.length = 0;

    let status = 0;
    let titel = "";
    let gelandet = route;

    try {
      const antwort = await page.goto(`${basis}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      status = antwort?.status() ?? 0;
      titel = await page.title();
      gelandet = new URL(page.url()).pathname;
    } catch (fehler) {
      console.log(
        `FEHL  ${route.padEnd(14)} nicht erreichbar: ${
          fehler instanceof Error ? fehler.message.split("\n")[0] : String(fehler)
        }`,
      );
      fehlerhaft += 1;
      continue;
    }

    const gut = status === 200;

    if (!gut) {
      fehlerhaft += 1;
    }

    const umleitung = gelandet === route ? "" : ` -> ${gelandet}`;

    console.log(
      `${gut ? "OK  " : "FEHL"}  ${route.padEnd(14)} ${status}  ${titel}${umleitung}`,
    );

    for (const fehler of konsolenfehler.slice(0, 3)) {
      console.log(`        Konsole: ${fehler}`);
    }
  }
} finally {
  await browser.close();
}

console.log(
  fehlerhaft === 0
    ? "\nAlle geprueften Routen antworten."
    : `\n${fehlerhaft} Routen mit Problem.`,
);

process.exit(fehlerhaft === 0 ? 0 : 1);
