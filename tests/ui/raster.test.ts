import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

/**
 * Abstaende halten sich an die Skala.
 *
 * Das Projekt beschraenkt die Tailwind-Spacing-Skala bewusst auf ein
 * 8pt-Raster. Der Haken daran: Tailwind verwirft eine Klasse, deren Stufe
 * nicht in der Skala steht, wortlos. `py-24` erzeugt dann einfach nichts.
 *
 * Genau das ist beim Redesign passiert - `abstand="weit"` bestand aus drei
 * Klassen, von denen keine einzige existierte, und der Abschnitt hatte gar
 * keinen Abstand. Weder die Typpruefung noch der Bau noch axe konnten das
 * finden: die Klasse steht ja im Quelltext.
 */

/** Klassen mit einer Zahlenstufe, die aus der Spacing-Skala kommt. */
const ABSTANDSKLASSE =
  /\b(?:-)?(p|m|gap|space|inset|top|right|bottom|left|w|h|min-w|min-h|max-w|max-h|translate-x|translate-y)(?:[trblxyse])?-(\d+(?:\.\d+)?)\b/g;

/**
 * Klassen, deren Zahl NICHT aus der Spacing-Skala kommt.
 *
 * grid-cols-3, gap-x sind eigene Skalen; z-40, opacity, border und
 * Rundungen ebenfalls. Sie werden vorher herausgefiltert.
 */
const EIGENE_SKALEN =
  /\b(?:grid-cols|grid-rows|col-span|row-span|z|order|opacity|border|rounded|leading|tracking|duration|delay|basis|flex|scale|rotate|decoration|underline-offset|outline|ring|shadow)-/;

async function spacingSkala(): Promise<Set<string>> {
  const konfiguration = await fs.readFile(
    path.join(process.cwd(), "tailwind.config.ts"),
    "utf8",
  );

  const beginn = konfiguration.indexOf("spacing: {");

  if (beginn === -1) {
    throw new Error("Kein spacing-Block in tailwind.config.ts.");
  }

  const ende = konfiguration.indexOf("}", beginn);
  const koerper = konfiguration.slice(beginn, ende);

  const stufen = new Set<string>();

  for (const treffer of koerper.matchAll(/^\s*([\w.]+):\s*"/gm)) {
    stufen.add(treffer[1]);
  }

  return stufen;
}

async function quelltexte(): Promise<Array<{ datei: string; inhalt: string }>> {
  const wurzel = process.cwd();
  const ergebnis: Array<{ datei: string; inhalt: string }> = [];

  async function durchlaufe(verzeichnis: string): Promise<void> {
    for (const eintrag of await fs.readdir(verzeichnis, { withFileTypes: true })) {
      if (eintrag.name === "node_modules" || eintrag.name.startsWith(".")) {
        continue;
      }

      const voll = path.join(verzeichnis, eintrag.name);

      if (eintrag.isDirectory()) {
        await durchlaufe(voll);
      } else if (/\.tsx$/.test(eintrag.name)) {
        ergebnis.push({
          datei: path.relative(wurzel, voll),
          inhalt: await fs.readFile(voll, "utf8"),
        });
      }
    }
  }

  for (const verzeichnis of ["app", "components"]) {
    await durchlaufe(path.join(wurzel, verzeichnis));
  }

  return ergebnis;
}

describe("Die Spacing-Skala", () => {
  test("enthaelt die Stufen, auf die sich der Abschnittsrhythmus stuetzt", async () => {
    const skala = await spacingSkala();

    for (const stufe of ["4", "8", "10", "12", "16", "20", "24", "28", "32"]) {
      expect(skala.has(stufe), `Stufe ${stufe} fehlt in tailwind.config.ts`).toBe(
        true,
      );
    }
  });

  test("jede Zahl ist ein Vielfaches von 8, oder eine benannte Ausnahme", async () => {
    const konfiguration = await fs.readFile(
      path.join(process.cwd(), "tailwind.config.ts"),
      "utf8",
    );

    const beginn = konfiguration.indexOf("spacing: {");
    const koerper = konfiguration.slice(beginn, konfiguration.indexOf("}", beginn));

    // 4px ist die halbe Stufe und seit AP1 erlaubt; touch und control sind
    // Trefferflaechen, keine Abstaende.
    const AUSNAHMEN = ["0px", "1px", "4px", "12px", "44px", "52px", "100%"];

    const daneben: string[] = [];

    for (const treffer of koerper.matchAll(/^\s*[\w.]+:\s*"([^"]+)"/gm)) {
      const wert = treffer[1];

      if (AUSNAHMEN.includes(wert)) {
        continue;
      }

      const px = Number.parseInt(wert, 10);

      if (Number.isFinite(px) && px % 8 !== 0) {
        daneben.push(wert);
      }
    }

    expect(daneben, "Diese Werte liegen nicht auf dem 8pt-Raster").toEqual([]);
  });
});

describe("Der Code benutzt nur Stufen, die es gibt", () => {
  test("die Suche findet ueberhaupt Abstandsklassen", async () => {
    const dateien = await quelltexte();
    const gesamt = dateien
      .map(({ inhalt }) => [...inhalt.matchAll(ABSTANDSKLASSE)].length)
      .reduce((a, b) => a + b, 0);

    expect(gesamt).toBeGreaterThan(100);
  });

  test("keine Klasse verweist auf eine Stufe ausserhalb der Skala", async () => {
    const skala = await spacingSkala();
    const dateien = await quelltexte();

    const unbekannt: string[] = [];

    for (const { datei, inhalt } of dateien) {
      for (const [nummer, zeile] of inhalt.split("\n").entries()) {
        for (const treffer of zeile.matchAll(ABSTANDSKLASSE)) {
          const ganz = treffer[0];
          const stufe = treffer[2];

          // Klassen aus anderen Skalen ueberspringen.
          if (EIGENE_SKALEN.test(ganz)) {
            continue;
          }

          if (!skala.has(stufe)) {
            unbekannt.push(`${datei}:${nummer + 1}  ${ganz}`);
          }
        }
      }
    }

    expect(
      unbekannt,
      "Diese Klassen erzeugen kein CSS - die Stufe fehlt in der Spacing-Skala",
    ).toEqual([]);
  });
});
