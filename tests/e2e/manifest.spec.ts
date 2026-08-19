import { expect, test } from "@playwright/test";

import { bestaetigeFarbmodus } from "./hilfen";
import { themeColor } from "../../lib/tokens/theme-color";

/**
 * Manifest, Leistenfarbe und Symbole.
 *
 * Im Altbestand sagte das Manifest #000000, das Meta-Tag #3A5BDB, und der
 * Hintergrund war beige - drei Antworten auf dieselbe Frage. Alle drei kommen
 * jetzt aus demselben Token. Diese Pruefung haelt fest, dass sie
 * uebereinstimmen, statt sich nur auf die gemeinsame Quelle zu verlassen.
 */

/** Rechnet "rgb(220, 201, 168)" in "#dcc9a8" um. */
function alsHex(rgb: string): string {
  const zahlen = rgb.match(/\d+/g);

  if (!zahlen || zahlen.length < 3) {
    throw new Error(`Unerwartete Farbangabe: ${rgb}`);
  }

  return `#${zahlen
    .slice(0, 3)
    .map((wert) => Number(wert).toString(16).padStart(2, "0"))
    .join("")}`;
}

test("das Manifest ist erreichbar und beschreibt den Dienst", async ({
  request,
}) => {
  const antwort = await request.get("/manifest.webmanifest");

  expect(antwort.status()).toBe(200);

  const manifest = await antwort.json();

  expect(manifest.name).toBe("Anomail");
  expect(manifest.lang).toBe("de");
  expect(manifest.start_url).toBe("/");
  expect(manifest.display).toBe("standalone");

  // Beide Farben aus demselben Token wie die Oberflaeche.
  expect(manifest.theme_color).toBe(themeColor("light"));
  expect(manifest.background_color).toBe(themeColor("light"));
});

test("die Symbole liegen wirklich vor und sind PNG", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();

  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

  for (const symbol of manifest.icons) {
    const antwort = await request.get(symbol.src);

    expect(antwort.status(), `${symbol.src} fehlt`).toBe(200);
    expect(antwort.headers()["content-type"]).toContain("image/png");

    const daten = await antwort.body();

    // PNG-Signatur. Eine 404-Seite mit Bild-Endung faellt hier auf.
    expect([...daten.subarray(0, 4)]).toEqual([137, 80, 78, 71]);
    expect(daten.length).toBeGreaterThan(200);
  }

  // Ein eigenes maskable-Symbol mit Sicherheitsabstand. Ein "any"-Symbol als
  // maskable zu deklarieren fuehrt dazu, dass das System die Raender abschneidet.
  const maskable = manifest.icons.filter(
    (symbol: { purpose?: string }) => symbol.purpose === "maskable",
  );
  const normal = manifest.icons.filter(
    (symbol: { purpose?: string }) => symbol.purpose === "any",
  );

  expect(maskable.length).toBe(1);
  expect(normal.length).toBeGreaterThanOrEqual(2);
  expect(
    normal.some(
      (symbol: { src: string }) => symbol.src === maskable[0].src,
    ),
    "Dasselbe Bild zweimal, einmal als maskable - das schneidet das System an",
  ).toBe(false);
});

test("die Leistenfarbe stimmt mit dem tatsaechlichen Hintergrund ueberein", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  // Erst messen, wenn die Helligkeit steht.
  await bestaetigeFarbmodus(page);

  const gemessen = await page.evaluate(() => {
    const metas = [
      ...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
    ].map((meta) => ({ media: meta.media, content: meta.content }));

    return {
      metas,
      hintergrund: getComputedStyle(document.body).backgroundColor,
      lang: document.documentElement.lang,
      viewport: document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
        ?.content,
    };
  });

  expect(gemessen.lang).toBe("de");

  // Zoom darf nicht gesperrt sein: WCAG 1.4.4 verlangt 200%.
  expect(gemessen.viewport).toContain("user-scalable=yes");
  expect(gemessen.viewport).not.toContain("maximum-scale=1");

  const modus = testInfo.project.use.colorScheme === "dark" ? "dark" : "light";
  const passend = gemessen.metas.find((meta) =>
    meta.media.includes(`prefers-color-scheme: ${modus}`),
  );

  expect(passend, `Kein theme-color fuer ${modus}`).toBeTruthy();
  expect(passend?.content).toBe(themeColor(modus));
  expect(alsHex(gemessen.hintergrund)).toBe(themeColor(modus));
});
