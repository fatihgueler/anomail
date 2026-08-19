/**
 * Erzeugt die App-Icons aus den Design-Tokens.
 *
 * Bewusst als Skript und nicht als abgelegte Bilddatei: die Farben stammen aus
 * denselben Tokens wie die Oberflaeche. Aendert sich ein Token, laesst sich das
 * Icon neu erzeugen, statt dass es unbemerkt veraltet.
 *
 * Gezeichnet wird ein Briefumschlag als einfache Geometrie - keine Schrift,
 * damit kein Zeichensatz noetig ist.
 */
import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

import { hslToRgb, parseHsl } from "../lib/tokens/contrast";
import { LIGHT_PALETTE } from "../lib/tokens/palette";

type Rgb = [number, number, number];

function token(name: keyof typeof LIGHT_PALETTE): Rgb {
  const [r, g, b] = hslToRgb(parseHsl(LIGHT_PALETTE[name]));
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

const HINTERGRUND = token("background");
const MARKE = token("primary");
const PAPIER = token("card");

/* ------------------------------------------------------------------ */
/* PNG                                                                 */
/* ------------------------------------------------------------------ */

const CRC_TABELLE = (() => {
  const tabelle = new Uint32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabelle[n] = c >>> 0;
  }

  return tabelle;
})();

function crc32(daten: Buffer): number {
  let c = 0xffffffff;

  for (const byte of daten) {
    c = CRC_TABELLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }

  return (c ^ 0xffffffff) >>> 0;
}

function chunk(typ: string, daten: Buffer): Buffer {
  const laenge = Buffer.alloc(4);
  laenge.writeUInt32BE(daten.length);

  const koerper = Buffer.concat([Buffer.from(typ, "ascii"), daten]);
  const pruefsumme = Buffer.alloc(4);
  pruefsumme.writeUInt32BE(crc32(koerper));

  return Buffer.concat([laenge, koerper, pruefsumme]);
}

function alsPng(breite: number, hoehe: number, pixel: Buffer): Buffer {
  const signatur = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0);
  ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8; // Bittiefe
  ihdr[9] = 2; // Farbtyp: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Jede Zeile bekommt ein Filterbyte 0 vorangestellt.
  const roh = Buffer.alloc(hoehe * (breite * 3 + 1));
  for (let y = 0; y < hoehe; y += 1) {
    roh[y * (breite * 3 + 1)] = 0;
    pixel.copy(
      roh,
      y * (breite * 3 + 1) + 1,
      y * breite * 3,
      (y + 1) * breite * 3,
    );
  }

  return Buffer.concat([
    signatur,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(roh, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ */
/* Zeichnung                                                           */
/* ------------------------------------------------------------------ */

/**
 * @param groesse  Kantenlaenge in Pixeln
 * @param anteil   Wie viel der Kante das Motiv einnimmt. Fuer maskable
 *                 kleiner, damit das System nichts Wesentliches abschneidet.
 */
function zeichne(groesse: number, anteil: number): Buffer {
  const pixel = Buffer.alloc(groesse * groesse * 3);

  const setze = (x: number, y: number, farbe: Rgb) => {
    const versatz = (y * groesse + x) * 3;
    pixel[versatz] = farbe[0];
    pixel[versatz + 1] = farbe[1];
    pixel[versatz + 2] = farbe[2];
  };

  const umschlagBreite = Math.round(groesse * anteil);
  const umschlagHoehe = Math.round(umschlagBreite * 0.68);
  const links = Math.round((groesse - umschlagBreite) / 2);
  const oben = Math.round((groesse - umschlagHoehe) / 2);
  const rahmen = Math.max(2, Math.round(groesse * 0.035));

  for (let y = 0; y < groesse; y += 1) {
    for (let x = 0; x < groesse; x += 1) {
      const imUmschlag =
        x >= links &&
        x < links + umschlagBreite &&
        y >= oben &&
        y < oben + umschlagHoehe;

      if (!imUmschlag) {
        setze(x, y, HINTERGRUND);
        continue;
      }

      const amRand =
        x < links + rahmen ||
        x >= links + umschlagBreite - rahmen ||
        y < oben + rahmen ||
        y >= oben + umschlagHoehe - rahmen;

      if (amRand) {
        setze(x, y, MARKE);
        continue;
      }

      // Die Lasche: zwei Diagonalen von den oberen Ecken zur Mitte.
      const relX = x - links;
      const relY = y - oben;
      const mitte = umschlagBreite / 2;
      const laschenHoehe = umschlagHoehe * 0.62;
      const erwartet =
        (relX <= mitte ? relX : umschlagBreite - relX) *
        (laschenHoehe / mitte);

      setze(
        x,
        y,
        Math.abs(relY - erwartet) <= rahmen / 1.4 ? MARKE : PAPIER,
      );
    }
  }

  return alsPng(groesse, groesse, pixel);
}

/* ------------------------------------------------------------------ */

const ziel = path.join(process.cwd(), "public");
await fs.mkdir(ziel, { recursive: true });

const dateien: Array<[string, Buffer]> = [
  ["icon-192.png", zeichne(192, 0.72)],
  ["icon-512.png", zeichne(512, 0.72)],
  // Sicherheitsabstand fuer maskable: das Motiv bleibt im inneren Kreis.
  ["icon-maskable-512.png", zeichne(512, 0.52)],
];

for (const [name, inhalt] of dateien) {
  await fs.writeFile(path.join(ziel, name), inhalt);
  console.log(`${name}: ${inhalt.length} Byte`);
}

console.log(`\nFarben aus den Tokens: Hintergrund ${LIGHT_PALETTE.background}, Marke ${LIGHT_PALETTE.primary}`);
