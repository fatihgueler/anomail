import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

/**
 * Der Sprachdurchgang als dauerhafter Test.
 *
 * Er prüft die sichtbaren Texte der Oberfläche gegen die Sprachregeln. Ein
 * einmaliger Durchgang würde beim nächsten neuen Text wieder auseinanderlaufen.
 *
 * Die Rechtstexte aus AP9 sind ausgenommen: sie folgen der dort üblichen Form
 * und werden anwaltlich gefüllt, nicht redaktionell.
 */

const AUSGENOMMEN = [
  path.join("app", "privacy"),
  path.join("app", "terms"),
  path.join("app", "agb"),
  path.join("app", "impressum"),
  path.join("app", "help"),
  path.join("app", "contact"),
  path.join("content", "legal"),
  // Die Entwickleransichten sind interne Werkzeuge, keine Nutzeroberfläche.
  path.join("app", "dev"),
];

/** Stellen, an denen ein Ausrufezeichen erlaubt ist. */
const KRISEN_DATEIEN = [
  path.join("components", "legal", "crisis-notice.tsx"),
  path.join("app", "write", "crisis-dialog.tsx"),
];

type Fund = { datei: string; zeile: number; text: string };

async function sammleQuelltext(): Promise<Array<{ datei: string; inhalt: string }>> {
  const wurzel = process.cwd();
  const ergebnis: Array<{ datei: string; inhalt: string }> = [];

  async function durchlaufe(verzeichnis: string): Promise<void> {
    const eintraege = await fs.readdir(verzeichnis, { withFileTypes: true });

    for (const eintrag of eintraege) {
      if (eintrag.name === "node_modules" || eintrag.name.startsWith(".")) {
        continue;
      }

      const voll = path.join(verzeichnis, eintrag.name);
      const relativ = path.relative(wurzel, voll);

      if (AUSGENOMMEN.some((pfad) => relativ.startsWith(pfad))) {
        continue;
      }

      if (eintrag.isDirectory()) {
        await durchlaufe(voll);
      } else if (/\.tsx?$/.test(eintrag.name)) {
        ergebnis.push({
          datei: relativ,
          inhalt: await fs.readFile(voll, "utf8"),
        });
      }
    }
  }

  for (const verzeichnis of ["app", "components", "lib"]) {
    await durchlaufe(path.join(wurzel, verzeichnis));
  }

  return ergebnis;
}

/**
 * Zieht aus einer Zeile heraus, was tatsächlich als Text auf dem Bildschirm
 * landen kann.
 *
 * Die Einschränkung ist wichtig: eine Suche über den rohen Quelltext meldet
 * `session!.user!.id!` als Ausrufezeichen und den Importpfad `action-groups`
 * als "Ups". Beides ist kein sichtbarer Text. Wer solche Treffer per Ausnahme
 * stillstellt, lockert die Prüfung; richtig ist, gar nicht erst im Code zu
 * suchen.
 */
function sichtbareTexte(zeile: string): string[] {
  const getrimmt = zeile.trim();

  // Kommentare, Importe und Direktiven tragen keinen sichtbaren Text.
  if (
    getrimmt.startsWith("*") ||
    getrimmt.startsWith("//") ||
    getrimmt.startsWith("/*") ||
    getrimmt.startsWith("import ") ||
    getrimmt.startsWith("export ") ||
    getrimmt.startsWith("from ")
  ) {
    return [];
  }

  const texte: string[] = [];

  // Zeichenketten in doppelten Anführungszeichen und Backticks.
  for (const treffer of getrimmt.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g)) {
    texte.push(treffer[1]);
  }
  for (const treffer of getrimmt.matchAll(/`([^`\\]*(?:\\.[^`\\]*)*)`/g)) {
    texte.push(treffer[1]);
  }

  // JSX-Text zwischen zwei Tags sowie am Zeilenanfang bzw. -ende.
  const ohneZeichenketten = getrimmt
    .replace(/"[^"]*"/g, '""')
    .replace(/`[^`]*`/g, "``");

  for (const treffer of ohneZeichenketten.matchAll(/>([^<>{}]+)</g)) {
    texte.push(treffer[1]);
  }

  // Freistehende JSX-Textzeile ohne Tags in derselben Zeile.
  if (!/[<>{}=]/.test(ohneZeichenketten) && /[a-zäöüßA-ZÄÖÜ]/.test(ohneZeichenketten)) {
    texte.push(ohneZeichenketten);
  }

  return texte.filter((text) => /[a-zäöüßA-ZÄÖÜ]/.test(text));
}

/** Sucht ausschließlich in sichtbarem Text. */
async function suche(
  muster: RegExp,
  options: { auchInKrisentexten?: boolean } = {},
): Promise<Fund[]> {
  const dateien = await sammleQuelltext();
  const funde: Fund[] = [];

  for (const { datei, inhalt } of dateien) {
    if (
      !options.auchInKrisentexten &&
      KRISEN_DATEIEN.some((pfad) => datei === pfad)
    ) {
      continue;
    }

    for (const [nummer, zeile] of inhalt.split("\n").entries()) {
      for (const text of sichtbareTexte(zeile)) {
        if (muster.test(text)) {
          funde.push({ datei, zeile: nummer + 1, text: text.slice(0, 100) });
          break;
        }
      }
    }
  }

  return funde;
}

describe("Die Prüfung sieht die Texte tatsächlich", () => {
  // Ohne diesen Nachweis bestünden alle folgenden Tests auch dann, wenn der
  // Extraktor gar nichts fände.
  test("der Extraktor erkennt Zeichenketten und JSX-Text", () => {
    expect(sichtbareTexte('  <p className="text-body">Dein Brief ist unterwegs</p>')).toContain(
      "Dein Brief ist unterwegs",
    );
    expect(sichtbareTexte('  const titel = "Deine Briefe";')).toContain("Deine Briefe");
    expect(sichtbareTexte("  { user: { id: session!.user!.id! } },")).toEqual([]);
    expect(sichtbareTexte('import { BanAction } from "../action-groups";')).toEqual([]);
  });

  test("ein bekannter Oberflächentext wird gefunden", async () => {
    const funde = await suche(/Anomail/);
    expect(funde.length).toBeGreaterThan(20);
  });
});

describe("Wortwahl", () => {
  const VERBOTEN = [
    "nahtlos",
    "mühelos",
    "muehelos",
    "revolutionär",
    "revolutionaer",
    "empower",
    "ganzheitlich",
  ];

  for (const wort of VERBOTEN) {
    test(`"${wort}" kommt nicht vor`, async () => {
      const funde = await suche(new RegExp(wort, "i"));
      expect(funde).toEqual([]);
    });
  }

  test('"Reise", "Erlebnis" kommen nicht vor', async () => {
    const funde = await suche(/\b(Reise|Erlebnis)\b/);
    expect(funde).toEqual([]);
  });
});

describe("Satzbau", () => {
  test('die Konstruktion "nicht nur X, sondern auch Y" kommt nicht vor', async () => {
    const funde = await suche(/nicht nur[^"]{0,80}sondern auch/i);
    expect(funde).toEqual([]);
  });

  test("kein Ausrufezeichen ausserhalb der Krisen-Hinweise", async () => {
    // Innerhalb von Zeichenketten, nicht in TypeScript-Operatoren wie a!.b
    const funde = await suche(/[a-zäöüß]!(?=["'\s.,])/);
    expect(funde).toEqual([]);
  });

  test("höchstens ein Gedankenstrich je Textzeile", async () => {
    const funde = await suche(/[—–][^—–"'`]{0,200}[—–]/);
    expect(funde).toEqual([]);
  });
});

describe("Sprache", () => {
  test("keine englischen Oberflächenwörter", async () => {
    // Der sichtbare Text besteht genau aus einem dieser Wörter.
    const funde = await suche(
      /^\s*(Loading|Error|Not Found|Submit|Cancel|Back|Next|Save|Delete|Settings|Sign in|Log in|Logout)\s*$/,
    );
    expect(funde).toEqual([]);
  });

  test("keine Entschuldigungsfloskel in Fehlermeldungen", async () => {
    const funde = await suche(
      /(Entschuldigung|Es tut uns leid|Leider ist (etwas|ein Fehler)|\bUps\b)/i,
    );
    expect(funde).toEqual([]);
  });

  test("keine aufmunternden Sprüche in Leerzuständen", async () => {
    const funde = await suche(
      /(Keine Sorge|Kein Problem|Viel Spaß|Viel Erfolg|Bleib dran|Du schaffst das)/i,
    );
    expect(funde).toEqual([]);
  });
});

describe("Ausnahmen sind eng gefasst", () => {
  test("die Krisen-Hinweise tragen tatsächlich den vorgegebenen Wortlaut", async () => {
    const wurzel = process.cwd();

    const fussleiste = await fs.readFile(
      path.join(wurzel, "components", "legal", "crisis-notice.tsx"),
      "utf8",
    );
    expect(fussleiste).toContain("Anomail ist kein Krisendienst");
    expect(fussleiste).toContain("Du bist nicht allein.");
    expect(fussleiste).toContain("tel:112");
    expect(fussleiste).toContain("tel:08001110111");

    const dialog = await fs.readFile(
      path.join(wurzel, "app", "write", "crisis-dialog.tsx"),
      "utf8",
    );
    expect(dialog).toContain("Dir gerade jetzt nicht gut?");
    expect(dialog).toContain(
      "Anomail ist kein Notfall- oder professioneller Krisendienst.",
    );
    expect(dialog).toContain("Kostenlose Hilfe – rund um die Uhr:");
  });

  test("auch die Krisen-Hinweise kommen ohne Ausrufezeichen aus", async () => {
    const funde = await suche(/[a-zäöüß]!(?=["'\s.,])/, {
      auchInKrisentexten: true,
    });
    expect(funde).toEqual([]);
  });
});
