import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  CONTRAST_THRESHOLDS,
  contrastRatio,
  formatRatio,
  passesContrast,
  roundRatio,
} from "@/lib/tokens/contrast";
import {
  CONTRAST_PAIRS,
  PALETTES,
  type Palette,
  type ThemeName,
  type TokenName,
} from "@/lib/tokens/palette";

/**
 * Die dauerhafte Kontrastprüfung.
 *
 * Sie rechnet jede verwendete Kombination aus den Token-Werten aus, in beiden
 * Farbmodi. Ändert jemand später einen Token, schlägt dieser Test fehl, bevor
 * die Änderung irgendwo sichtbar wird — der Kontrast kann nicht unbemerkt
 * kaputtgehen.
 *
 * Zusätzlich prüft der Test, dass die Liste vollständig ist: jeder Token, der
 * im Code als Schriftfarbe oder als Fläche vorkommt, muss in mindestens einem
 * Paar auftauchen. Sonst könnte eine neue Kombination an der Prüfung
 * vorbeilaufen.
 */

const THEMES: ThemeName[] = ["light", "dark"];

describe("Kontrast aller Token-Kombinationen", () => {
  for (const theme of THEMES) {
    describe(theme === "light" ? "Hell" : "Dunkel", () => {
      const palette: Palette = PALETTES[theme];

      for (const pair of CONTRAST_PAIRS) {
        const ratio = contrastRatio(
          palette[pair.foreground],
          palette[pair.background],
        );

        test(`${pair.usage} (${pair.foreground} auf ${pair.background}) erreicht ${formatRatio(ratio)}`, () => {
          expect(
            passesContrast(ratio, pair.requirement),
            `${pair.usage}: ${formatRatio(ratio)} liegt unter ${CONTRAST_THRESHOLDS[pair.requirement]}:1`,
          ).toBe(true);
        });
      }
    });
  }

  test("beide Farbmodi decken dieselben Kombinationen ab", () => {
    // Kein Modus darf eine Kombination auslassen — sonst prüft der Test den
    // dunklen Modus schwächer als den hellen.
    for (const pair of CONTRAST_PAIRS) {
      for (const theme of THEMES) {
        expect(PALETTES[theme][pair.foreground]).toBeDefined();
        expect(PALETTES[theme][pair.background]).toBeDefined();
      }
    }
  });
});

describe("Die Akzentfarbe färbt keinen Text", () => {
  test("text-accent kommt im Code nicht vor", async () => {
    const treffer = await grepQuelltext(/text-accent(?!-foreground)/);
    expect(treffer).toEqual([]);
  });

  test("im hellen Modus wäre sie als Textfarbe auch nicht lesbar", () => {
    // Der Beleg dafür, warum die Regel existiert: im Altsystem stand die
    // Akzentfarbe als Schrift bei 1,54:1.
    //
    // Nur der helle Modus wird geprüft. Im dunklen läge der Wert über der
    // Grenze — die Regel gilt trotzdem, sie ist eine gestalterische
    // Festlegung und keine reine Kontrastfrage.
    const ratio = contrastRatio(
      PALETTES.light.accent,
      PALETTES.light.background,
    );

    expect(roundRatio(ratio)).toBeLessThan(4.5);
  });
});

describe("Vollständigkeit der Prüfliste", () => {
  const TEXT_TOKENS: TokenName[] = [
    "foreground",
    "muted-foreground",
    "card-foreground",
    "secondary-foreground",
    "primary",
    "primary-foreground",
    "destructive",
    "destructive-foreground",
    "accent-foreground",
  ];

  const SURFACE_TOKENS: TokenName[] = [
    "background",
    "card",
    "secondary",
    "muted",
    "primary",
    "destructive",
    "accent",
  ];

  test("jede im Code verwendete Schriftfarbe steht in mindestens einem Paar", async () => {
    const geprueft = new Set(CONTRAST_PAIRS.map((pair) => pair.foreground));

    for (const token of TEXT_TOKENS) {
      const verwendet = await grepQuelltext(
        new RegExp(`text-${token}(?![\\w-])`),
      );

      if (verwendet.length > 0) {
        expect(
          geprueft.has(token),
          `text-${token} wird verwendet, steht aber in keinem Kontrastpaar`,
        ).toBe(true);
      }
    }
  });

  test("jede im Code verwendete Fläche steht in mindestens einem Paar", async () => {
    const geprueft = new Set(CONTRAST_PAIRS.map((pair) => pair.background));

    for (const token of SURFACE_TOKENS) {
      const verwendet = await grepQuelltext(new RegExp(`bg-${token}(?![\\w-])`));

      if (verwendet.length > 0) {
        expect(
          geprueft.has(token),
          `bg-${token} wird verwendet, steht aber in keinem Kontrastpaar`,
        ).toBe(true);
      }
    }
  });
});

describe("Keine hartkodierten Farbwerte", () => {
  /**
   * Eine Kontrastkorrektur gehört an die Token-Definition. Ein Einzelfall-
   * Override in einer Seite entzieht sich der Prüfung oben und bricht beim
   * nächsten Token-Wechsel lautlos.
   */
  const VERBOTEN = [
    { muster: /#[0-9a-fA-F]{3,8}\b/, name: "Hex-Farbwert" },
    { muster: /\brgba?\(/, name: "rgb()/rgba()" },
    { muster: /\bhsla?\(/, name: "hsl()/hsla()" },
    { muster: /\boklch\(/, name: "oklch()" },
    { muster: /gradient/, name: "Farbverlauf" },
    { muster: /drop-shadow/, name: "Schlagschatten" },
    { muster: /shadow-(sm|md|lg|xl|2xl)\b/, name: "Schatten ausser dem Kartenschatten" },
  ];

  for (const { muster, name } of VERBOTEN) {
    test(`${name} kommt im Komponentencode nicht vor`, async () => {
      const treffer = await grepQuelltext(muster, {
        // Die Token-Definitionen selbst tragen zwangsläufig Farbwerte.
        ausnahmen: [
          path.join("lib", "tokens"),
          path.join("app", "dev"),
          path.join("content", "legal"),
        ],
      });

      expect(treffer).toEqual([]);
    });
  }
});

/* ------------------------------------------------------------------ */

type GrepOptions = { ausnahmen?: string[] };

/** Durchsucht den Anwendungscode. Tests und Abhängigkeiten bleiben aussen vor. */
async function grepQuelltext(
  muster: RegExp,
  options: GrepOptions = {},
): Promise<string[]> {
  const wurzel = process.cwd();
  const treffer: string[] = [];

  async function durchlaufe(verzeichnis: string): Promise<void> {
    const eintraege = await fs.readdir(verzeichnis, { withFileTypes: true });

    for (const eintrag of eintraege) {
      if (eintrag.name === "node_modules" || eintrag.name.startsWith(".")) {
        continue;
      }

      const voll = path.join(verzeichnis, eintrag.name);
      const relativ = path.relative(wurzel, voll);

      if (options.ausnahmen?.some((pfad) => relativ.startsWith(pfad))) {
        continue;
      }

      if (eintrag.isDirectory()) {
        await durchlaufe(voll);
        continue;
      }

      if (!/\.tsx?$/.test(eintrag.name)) {
        continue;
      }

      const inhalt = await fs.readFile(voll, "utf8");

      for (const [nummer, zeile] of inhalt.split("\n").entries()) {
        // Kommentarzeilen zählen nicht: dort steht die Begründung, warum
        // etwas so ist, nicht die Umsetzung.
        const getrimmt = zeile.trim();
        if (getrimmt.startsWith("*") || getrimmt.startsWith("//")) {
          continue;
        }

        if (muster.test(zeile)) {
          treffer.push(`${relativ}:${nummer + 1}`);
        }
      }
    }
  }

  for (const verzeichnis of ["app", "components", "lib", "content"]) {
    await durchlaufe(path.join(wurzel, verzeichnis));
  }

  return treffer;
}
