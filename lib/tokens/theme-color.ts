import { hslToRgb, parseHsl } from "./contrast";
import { PALETTES, type ThemeName } from "./palette";

/**
 * Die Hintergrundfarbe als Hex-Wert.
 *
 * Browserleiste und Manifest verlangen einen festen Farbwert; sie koennen
 * keine CSS-Variable lesen. Statt die Farbe dort ein zweites Mal
 * hinzuschreiben, wird sie hier aus demselben Token berechnet, aus dem auch
 * die Oberflaeche ihren Hintergrund bezieht.
 *
 * Damit koennen Manifest, Meta-Tag und tatsaechlicher Hintergrund nicht
 * auseinanderlaufen - genau das war im Altbestand der Fall.
 */
export function themeColor(theme: ThemeName): string {
  const [r, g, b] = hslToRgb(parseHsl(PALETTES[theme].background));

  const kanal = (wert: number) =>
    Math.round(wert * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${kanal(r)}${kanal(g)}${kanal(b)}`;
}
