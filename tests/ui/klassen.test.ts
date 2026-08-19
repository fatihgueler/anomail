import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { cn } from "@/lib/utils";

/**
 * cn() darf keine Klasse verschlucken, die es nicht versteht.
 *
 * tailwind-merge raet anhand des Praefixes, welche Klassen einander
 * widersprechen. Eigene Token-Namen kennt es nicht: `border-control` hielt es
 * fuer eine Rahmenfarbe und liess sie von `border-primary` verdraengen - jeder
 * Sekundaer-Button stand daraufhin ohne Rahmen da. Auffallen konnte das weder
 * der Typpruefung noch axe noch der Kontrastrechnung, weil die Klasse im
 * Quelltext ja dasteht.
 *
 * Deshalb hier: einmal das Verhalten selbst, einmal der Abgleich zwischen
 * tailwind.config.ts und lib/utils.ts.
 */

describe("cn behaelt widerspruchsfreie Klassen", () => {
  test("Rahmenbreite und Rahmenfarbe ueberleben nebeneinander", () => {
    const ergebnis = cn("border-control border-primary");

    expect(ergebnis).toContain("border-control");
    expect(ergebnis).toContain("border-primary");
  });

  test("Schriftgroesse und Textfarbe ueberleben nebeneinander", () => {
    const ergebnis = cn("text-body text-muted-foreground");

    expect(ergebnis).toContain("text-body");
    expect(ergebnis).toContain("text-muted-foreground");
  });

  test("der Akzentbalken behaelt seine Breite", () => {
    const ergebnis = cn("border-accentbar border-accent");

    expect(ergebnis).toContain("border-accentbar");
    expect(ergebnis).toContain("border-accent");
  });

  test("echte Widersprueche werden weiterhin aufgeloest", () => {
    // Ohne diesen Nachweis koennte die Ergaenzung alles durchlassen und die
    // Pruefungen darueber bestuenden aus dem falschen Grund.
    expect(cn("text-body text-small")).toBe("text-small");
    expect(cn("border-control border-2")).toBe("border-2");
    expect(cn("text-primary text-muted-foreground")).toBe(
      "text-muted-foreground",
    );
  });
});

describe("Die Ergaenzung deckt die Konfiguration ab", () => {
  /** Liest die Schluessel eines Abschnitts aus tailwind.config.ts. */
  async function schluesselVon(abschnitt: string): Promise<string[]> {
    const konfiguration = await fs.readFile(
      path.join(process.cwd(), "tailwind.config.ts"),
      "utf8",
    );

    const beginn = konfiguration.indexOf(`${abschnitt}: {`);

    if (beginn === -1) {
      throw new Error(`Abschnitt ${abschnitt} nicht in tailwind.config.ts.`);
    }

    // Bis zur schliessenden Klammer derselben Ebene.
    let tiefe = 0;
    let ende = beginn;

    for (let i = konfiguration.indexOf("{", beginn); i < konfiguration.length; i += 1) {
      if (konfiguration[i] === "{") {
        tiefe += 1;
      } else if (konfiguration[i] === "}") {
        tiefe -= 1;
        if (tiefe === 0) {
          ende = i;
          break;
        }
      }
    }

    const koerper = konfiguration.slice(beginn, ende);

    return [...koerper.matchAll(/^\s{6}([A-Za-z][\w-]*):/gm)].map(
      (treffer) => treffer[1],
    );
  }

  test("jede eigene Rahmenbreite ist tailwind-merge bekannt", async () => {
    const konfiguriert = (await schluesselVon("borderWidth")).filter(
      (name) => name !== "DEFAULT",
    );

    const unbekannt = konfiguriert.filter((name) => {
      const ergebnis = cn(`border-${name} border-primary`);
      return !ergebnis.includes(`border-${name}`);
    });

    expect(
      unbekannt,
      "Diese Rahmenbreiten fehlen in der classGroups-Ergaenzung in lib/utils.ts",
    ).toEqual([]);
  });

  test("jede eigene Schriftgroesse ist tailwind-merge bekannt", async () => {
    const konfiguriert = await schluesselVon("fontSize");

    const unbekannt = konfiguriert.filter((name) => {
      const ergebnis = cn(`text-${name} text-muted-foreground`);
      return !ergebnis.includes(`text-${name}`);
    });

    expect(
      unbekannt,
      "Diese Schriftgroessen fehlen in der classGroups-Ergaenzung in lib/utils.ts",
    ).toEqual([]);
  });

  test("die Suche findet ueberhaupt Schluessel", async () => {
    // Nur benannte Schluessel; rein numerische wie "2" sind Tailwind-Standard
    // und tailwind-merge ohnehin bekannt.
    expect(await schluesselVon("borderWidth")).toEqual(
      expect.arrayContaining(["control", "accentbar"]),
    );
    expect(await schluesselVon("fontSize")).toEqual(
      expect.arrayContaining(["display", "body", "label"]),
    );
  });
});
