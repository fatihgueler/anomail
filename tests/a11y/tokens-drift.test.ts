import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { DARK_PALETTE, LIGHT_PALETTE, type Palette } from "@/lib/tokens/palette";

/**
 * Die Token-Werte stehen an drei Stellen. Hier wird nachgewiesen, dass sie
 * uebereinstimmen.
 *
 *   1. app/globals.css, :root                  - der helle Modus
 *   2. app/globals.css, .dark                  - der dunkle Modus
 *   3. app/globals.css, prefers-color-scheme   - derselbe dunkle Modus ohne
 *                                                JavaScript
 *   4. lib/tokens/palette.ts                   - dieselben Werte als Daten,
 *                                                Grundlage der Kontrastrechnung
 *
 * Dreifache Pflege von Hand geht schief, und sie ist schon einmal schiefgegangen:
 * der Media-Query-Zweig hatte primary-hover, primary-active, destructive-hover
 * und destructive-active nie mitbekommen. Wer ohne JavaScript im dunklen Modus
 * unterwegs war, bekam beim Hovern die hellen Werte.
 *
 * Und der gefaehrlichere Fall: waeren globals.css und palette.ts
 * auseinandergelaufen, wuerde die Kontrastpruefung Werte rechnen, die niemand
 * zu sehen bekommt - 103 gruene Tests ueber einer Palette, die es nicht gibt.
 */

const FARB_TOKEN = /^\s*--([a-z-]+):\s*(\d[\d.]*\s+[\d.]+%\s+[\d.]+%);/gm;

async function globalsCss(): Promise<string> {
  return fs.readFile(path.join(process.cwd(), "app", "globals.css"), "utf8");
}

/** Schneidet einen Block anhand seiner Klammerung heraus. */
function block(inhalt: string, selektor: string): string {
  const beginn = inhalt.indexOf(selektor);

  if (beginn === -1) {
    throw new Error(`Selektor ${selektor} nicht in globals.css gefunden.`);
  }

  let tiefe = 0;
  const auf = inhalt.indexOf("{", beginn);

  for (let i = auf; i < inhalt.length; i += 1) {
    if (inhalt[i] === "{") {
      tiefe += 1;
    } else if (inhalt[i] === "}") {
      tiefe -= 1;

      if (tiefe === 0) {
        return inhalt.slice(auf, i);
      }
    }
  }

  throw new Error(`Block ${selektor} ist nicht geschlossen.`);
}

/** Liest die Farb-Tokens eines Blocks als Zuordnung Name → HSL-Tripel. */
function farbTokens(quelltext: string): Record<string, string> {
  const gefunden: Record<string, string> = {};

  for (const treffer of quelltext.matchAll(FARB_TOKEN)) {
    gefunden[treffer[1]] = treffer[2].replace(/\s+/g, " ").trim();
  }

  return gefunden;
}

function alsZuordnung(palette: Palette): Record<string, string> {
  return Object.fromEntries(
    Object.entries(palette).map(([name, wert]) => [
      name,
      wert.replace(/\s+/g, " ").trim(),
    ]),
  );
}

describe("Die Token-Bloecke in globals.css", () => {
  test("die Suche findet ueberhaupt Tokens", async () => {
    const css = await globalsCss();
    const hell = farbTokens(block(css, ":root {"));

    expect(Object.keys(hell).length).toBeGreaterThan(20);
    expect(hell.background).toBeTruthy();
  });

  test(".dark und der Media-Query-Zweig sind wortgleich", async () => {
    const css = await globalsCss();

    const dark = farbTokens(block(css, ".dark {"));
    const ohneJs = farbTokens(block(css, ":root:not(.light) {"));

    // Erst die Namen: fehlt ein Token im Fallback, greift dort der helle Wert.
    expect(Object.keys(ohneJs).sort()).toEqual(Object.keys(dark).sort());

    // Dann die Werte.
    expect(ohneJs).toEqual(dark);
  });

  test("der dunkle Modus definiert jedes Token des hellen", async () => {
    const css = await globalsCss();

    const hell = Object.keys(farbTokens(block(css, ":root {"))).sort();
    const dunkel = Object.keys(farbTokens(block(css, ".dark {"))).sort();

    const fehlend = hell.filter((name) => !dunkel.includes(name));

    expect(
      fehlend,
      "Diese Tokens fehlen im dunklen Modus und behalten dort den hellen Wert",
    ).toEqual([]);
  });
});

describe("globals.css und palette.ts stimmen ueberein", () => {
  test("heller Modus", async () => {
    const css = farbTokens(block(await globalsCss(), ":root {"));
    const daten = alsZuordnung(LIGHT_PALETTE);

    for (const [name, wert] of Object.entries(daten)) {
      expect(css[name], `--${name} fehlt in globals.css`).toBeDefined();
      expect(
        css[name],
        `--${name}: globals.css sagt "${css[name]}", palette.ts sagt "${wert}"`,
      ).toBe(wert);
    }
  });

  test("dunkler Modus", async () => {
    const css = farbTokens(block(await globalsCss(), ".dark {"));
    const daten = alsZuordnung(DARK_PALETTE);

    for (const [name, wert] of Object.entries(daten)) {
      expect(css[name], `--${name} fehlt im dunklen Block`).toBeDefined();
      expect(
        css[name],
        `--${name}: globals.css sagt "${css[name]}", palette.ts sagt "${wert}"`,
      ).toBe(wert);
    }
  });

  test("palette.ts kennt jedes Farb-Token aus globals.css", async () => {
    const css = Object.keys(farbTokens(block(await globalsCss(), ":root {")));
    const daten = Object.keys(LIGHT_PALETTE);

    const unbekannt = css.filter((name) => !daten.includes(name));

    expect(
      unbekannt,
      "Diese Tokens stehen in globals.css, aber nicht in palette.ts - sie werden nie auf Kontrast geprueft",
    ).toEqual([]);
  });
});
