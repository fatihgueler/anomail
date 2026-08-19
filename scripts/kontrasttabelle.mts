/**
 * Gibt die vollstaendige Kontrasttabelle aus, in beiden Helligkeiten.
 *
 * Die Werte entstehen aus denselben Token-Daten wie globals.css. Der Bericht
 * bekommt damit gerechnete Zahlen statt geschaetzter.
 */
import {
  CONTRAST_THRESHOLDS,
  contrastRatio,
  formatRatio,
  passesContrast,
} from "../lib/tokens/contrast";
import { CONTRAST_PAIRS, PALETTES } from "../lib/tokens/palette";

const zeilen: string[] = [
  "| Verwendung | Kombination | Anforderung | Hell | Dunkel |",
  "| --- | --- | --- | --- | --- |",
];

let durchgefallen = 0;

for (const paar of CONTRAST_PAIRS) {
  const hell = contrastRatio(
    PALETTES.light[paar.foreground],
    PALETTES.light[paar.background],
  );
  const dunkel = contrastRatio(
    PALETTES.dark[paar.foreground],
    PALETTES.dark[paar.background],
  );

  const okHell = passesContrast(hell, paar.requirement);
  const okDunkel = passesContrast(dunkel, paar.requirement);

  if (!okHell || !okDunkel) {
    durchgefallen += 1;
  }

  const schwelle = CONTRAST_THRESHOLDS[paar.requirement]
    .toFixed(1)
    .replace(".", ",");

  zeilen.push(
    `| ${paar.usage} | \`${paar.foreground}\` auf \`${paar.background}\` | ${schwelle}:1 | ${formatRatio(hell)} ${okHell ? "bestanden" : "DURCHGEFALLEN"} | ${formatRatio(dunkel)} ${okDunkel ? "bestanden" : "DURCHGEFALLEN"} |`,
  );
}

console.log(zeilen.join("\n"));
console.log(
  `\nPaare: ${CONTRAST_PAIRS.length}, durchgefallen: ${durchgefallen}`,
);
