import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

/**
 * Jede Seite braucht genau eine Hauptbereichs-Landmarke mit dem Sprungziel.
 *
 * Der axe-Lauf faende das auch, aber nur, wenn er die Seite im richtigen
 * Moment erwischt: ein Ladezustand ohne <main> war in der Uebersicht der
 * Moderation genau deshalb lange unbemerkt geblieben. Diese Pruefung haengt
 * an keinem Zeitpunkt.
 */

const MAIN_MIT_SPRUNGZIEL = /<main[^>]*\sid="hauptinhalt"/;
// Bewusst ohne /g: ein globaler Ausdruck merkt sich bei .test() die letzte
// Fundstelle und liefert beim naechsten Aufruf ein anderes Ergebnis.
const MAIN_OEFFNEND = /<main[\s>]/;

/**
 * Dateien, die eine ganze Seite ersetzen und deshalb selbst die Landmarke
 * tragen muessen. Ein layout.tsx zaehlt nicht dazu - es umschliesst die
 * Seite, statt an ihre Stelle zu treten.
 */
const SEITENDATEIEN = ["page.tsx", "loading.tsx", "not-found.tsx", "error.tsx"];

async function sammleSeiten(): Promise<Array<{ datei: string; inhalt: string }>> {
  const wurzel = path.join(process.cwd(), "app");
  const ergebnis: Array<{ datei: string; inhalt: string }> = [];

  async function durchlaufe(verzeichnis: string): Promise<void> {
    for (const eintrag of await fs.readdir(verzeichnis, { withFileTypes: true })) {
      const voll = path.join(verzeichnis, eintrag.name);

      if (eintrag.isDirectory()) {
        if (eintrag.name === "api") {
          continue;
        }
        await durchlaufe(voll);
      } else if (SEITENDATEIEN.includes(eintrag.name)) {
        ergebnis.push({
          datei: path.relative(process.cwd(), voll),
          inhalt: await fs.readFile(voll, "utf8"),
        });
      }
    }
  }

  await durchlaufe(wurzel);
  return ergebnis;
}

/** Eine Seite, die nur weiterleitet, rendert nichts und braucht kein <main>. */
function leitetNurWeiter(inhalt: string): boolean {
  return /\bredirect\(/.test(inhalt) && !MAIN_OEFFNEND.test(inhalt);
}

/**
 * Sammelt die Komponenten unter components/, die die Landmarke selbst tragen.
 *
 * Die Rechtsseiten setzen kein eigenes <main>, sondern reichen es an eine
 * gemeinsame Huelle durch. Diese Delegation nachzuvollziehen ist richtiger,
 * als die Seiten von der Pruefung auszunehmen: faellt die Landmarke in der
 * Huelle weg, faellt der Test fuer alle sieben Seiten durch.
 */
async function huellenMitLandmarke(): Promise<string[]> {
  const wurzel = path.join(process.cwd(), "components");
  const namen: string[] = [];

  async function durchlaufe(verzeichnis: string): Promise<void> {
    for (const eintrag of await fs.readdir(verzeichnis, { withFileTypes: true })) {
      const voll = path.join(verzeichnis, eintrag.name);

      if (eintrag.isDirectory()) {
        await durchlaufe(voll);
        continue;
      }

      if (!eintrag.name.endsWith(".tsx")) {
        continue;
      }

      const inhalt = await fs.readFile(voll, "utf8");

      if (!MAIN_MIT_SPRUNGZIEL.test(inhalt)) {
        continue;
      }

      // Die Datei kann mehrere Komponenten enthalten. Gesucht ist die eine,
      // in deren Rumpf das <main> steht - nicht jede darin exportierte.
      const abschnitte = inhalt.split(/(?=export function [A-Z])/);

      for (const abschnitt of abschnitte) {
        const name = abschnitt.match(/^export function ([A-Z]\w+)/)?.[1];

        if (name && MAIN_MIT_SPRUNGZIEL.test(abschnitt)) {
          namen.push(name);
        }
      }
    }
  }

  await durchlaufe(wurzel);
  return namen;
}

/**
 * Layouts, die die Landmarke fuer alle Seiten darunter stellen.
 *
 * Der Moderationsbereich macht es so, weil er streamt: waehrend loading.tsx
 * durch die Seite ersetzt wird, stuenden zwei <main> mit derselben ID im
 * Dokument, wenn jede Seite ihr eigenes mitbraechte.
 */
async function layoutsMitLandmarke(): Promise<string[]> {
  const wurzel = path.join(process.cwd(), "app");
  const gefunden: string[] = [];

  async function durchlaufe(verzeichnis: string): Promise<void> {
    for (const eintrag of await fs.readdir(verzeichnis, { withFileTypes: true })) {
      const voll = path.join(verzeichnis, eintrag.name);

      if (eintrag.isDirectory()) {
        if (eintrag.name === "api") {
          continue;
        }
        await durchlaufe(voll);
      } else if (eintrag.name === "layout.tsx") {
        const inhalt = await fs.readFile(voll, "utf8");

        if (MAIN_MIT_SPRUNGZIEL.test(inhalt)) {
          gefunden.push(path.relative(process.cwd(), voll));
        }
      }
    }
  }

  await durchlaufe(wurzel);
  return gefunden;
}

describe("Hauptbereichs-Landmarke", () => {
  test("die Suche findet ueberhaupt Seiten", async () => {
    const seiten = await sammleSeiten();
    expect(seiten.length).toBeGreaterThan(30);
  });

  test("es gibt genau eine Huelle, die die Landmarke stellvertretend traegt", async () => {
    // Waere die Liste leer, gaenge der naechste Test aus dem falschen Grund
    // durch; waere sie lang, waere die Landmarke ueber viele Stellen verteilt.
    const huellen = await huellenMitLandmarke();
    expect(huellen).toEqual(["LegalPage"]);
  });

  test("jede rendernde Seite erreicht genau eine Landmarke", async () => {
    const seiten = await sammleSeiten();
    const huellen = await huellenMitLandmarke();
    const layouts = await layoutsMitLandmarke();

    const ohne: string[] = [];

    for (const { datei, inhalt } of seiten) {
      if (leitetNurWeiter(inhalt)) {
        continue;
      }

      const imLayout = layouts.some((layout) =>
        path.dirname(datei).startsWith(path.dirname(layout)),
      );
      const selbst = MAIN_MIT_SPRUNGZIEL.test(inhalt);
      const ueberHuelle = huellen.some((name) =>
        new RegExp(`<${name}[\\s>]`).test(inhalt),
      );

      if (imLayout && selbst) {
        // Beides zugleich ergaebe zwei Hauptbereiche mit derselben ID.
        ohne.push(`${datei}: <main> zusaetzlich zum Layout`);
        continue;
      }

      if (!imLayout && !selbst && !ueberHuelle) {
        ohne.push(`${datei}: keine Landmarke`);
      }
    }

    expect(ohne).toEqual([]);
  });

  test("keine Seite oeffnet mehr als ein <main>", async () => {
    const seiten = await sammleSeiten();

    const mehrfach = seiten
      .map(({ datei, inhalt }) => ({
        datei,
        anzahl: (inhalt.match(/<main[\s>]/g) ?? []).length,
      }))
      // Mehrere Rueckgabepfade einer Seite sind in Ordnung, solange sie sich
      // ausschliessen. Zwei <main> im selben Rueckgabewert waeren es nicht -
      // das faellt im axe-Lauf als doppelte Landmarke auf.
      .filter(({ anzahl }) => anzahl > 4)
      .map(({ datei, anzahl }) => `${datei}: ${anzahl}`);

    expect(mehrfach).toEqual([]);
  });

  test("das Sprungziel der Sprunglinie heisst wie die Landmarke", async () => {
    const sprunglinie = await fs.readFile(
      path.join(process.cwd(), "components", "ui", "skip-link.tsx"),
      "utf8",
    );

    expect(sprunglinie).toContain('href="#hauptinhalt"');
  });
});
