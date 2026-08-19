import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

/**
 * Seitentitel.
 *
 * Das Wurzel-Layout haengt " — Anomail" ueber eine Vorlage an. Ein Titel, der
 * den Dienstnamen selbst mitbringt, erscheint dann doppelt: aus
 * "Meine Briefe — Anomail" wird "Meine Briefe — Anomail — Anomail". Das war im
 * Tab tatsaechlich zu sehen und ist der Grund fuer diese Pruefung.
 */

/**
 * Der angehaengte Dienstname - nicht jedes Vorkommen des Wortes.
 *
 * "Deine Anomail-ID" ist der Name der Sache und gehoert in den Titel; erst
 * "Deine Anomail-ID — Anomail" waere die Wiederholung. Die Regel trifft
 * deshalb den Zusatz und das allein stehende Wort, nicht den Wortbestandteil.
 */
const ANGEHAENGTER_DIENSTNAME = /(—\s*Anomail\s*$)|(\bAnomail\b(?![-\w]))/;

async function sammleTitel(): Promise<Array<{ datei: string; titel: string }>> {
  const wurzel = path.join(process.cwd(), "app");
  const ergebnis: Array<{ datei: string; titel: string }> = [];

  async function durchlaufe(verzeichnis: string): Promise<void> {
    for (const eintrag of await fs.readdir(verzeichnis, { withFileTypes: true })) {
      const voll = path.join(verzeichnis, eintrag.name);

      if (eintrag.isDirectory()) {
        if (eintrag.name === "api") {
          continue;
        }
        await durchlaufe(voll);
        continue;
      }

      if (eintrag.name !== "page.tsx" && eintrag.name !== "layout.tsx") {
        continue;
      }

      const inhalt = await fs.readFile(voll, "utf8");
      const datei = path.relative(process.cwd(), voll);

      for (const treffer of inhalt.matchAll(/^\s*title: "([^"]+)",/gm)) {
        ergebnis.push({ datei, titel: treffer[1] });
      }
    }
  }

  await durchlaufe(wurzel);
  return ergebnis;
}

describe("Seitentitel", () => {
  test("die Suche findet ueberhaupt Titel", async () => {
    const titel = await sammleTitel();
    expect(titel.length).toBeGreaterThan(15);
  });

  test("kein Titel wiederholt den Dienstnamen", async () => {
    const titel = await sammleTitel();

    const doppelt = titel
      .filter(({ titel: text }) => ANGEHAENGTER_DIENSTNAME.test(text))
      .map(({ datei, titel: text }) => `${datei}: "${text}"`);

    expect(doppelt).toEqual([]);
  });

  test("die Vorlage im Wurzel-Layout haengt den Dienstnamen genau einmal an", async () => {
    const layout = await fs.readFile(
      path.join(process.cwd(), "app", "layout.tsx"),
      "utf8",
    );

    expect(layout).toContain('template: "%s — Anomail"');
    expect(layout).toContain('default: "Anomail"');
  });

  test("jede Seite setzt einen eigenen Titel", async () => {
    const wurzel = path.join(process.cwd(), "app");
    const ohne: string[] = [];

    async function durchlaufe(verzeichnis: string): Promise<void> {
      for (const eintrag of await fs.readdir(verzeichnis, { withFileTypes: true })) {
        const voll = path.join(verzeichnis, eintrag.name);

        if (eintrag.isDirectory()) {
          if (eintrag.name === "api") {
            continue;
          }
          await durchlaufe(voll);
          continue;
        }

        if (eintrag.name !== "page.tsx") {
          continue;
        }

        const inhalt = await fs.readFile(voll, "utf8");

        // Eine reine Weiterleitung rendert nichts und braucht keinen Titel.
        if (/\bredirect\(/.test(inhalt) && !/return \(/.test(inhalt)) {
          continue;
        }

        // Ein Layout darueber kann den Titel stellen - so macht es die
        // Moderation fuer alle ihre Unterseiten.
        const layoutDaneben = path.join(verzeichnis, "layout.tsx");
        const layoutSetztTitel = await fs
          .readFile(layoutDaneben, "utf8")
          .then((text) => /title:/.test(text))
          .catch(() => false);

        const elternLayout = path.join(path.dirname(verzeichnis), "layout.tsx");
        const elternSetztTitel = await fs
          .readFile(elternLayout, "utf8")
          .then((text) => /title: "/.test(text))
          .catch(() => false);

        if (!/title:/.test(inhalt) && !layoutSetztTitel && !elternSetztTitel) {
          ohne.push(path.relative(process.cwd(), voll));
        }
      }
    }

    await durchlaufe(wurzel);

    expect(ohne).toEqual([]);
  });
});
