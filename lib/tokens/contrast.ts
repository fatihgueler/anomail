/**
 * Kontrastberechnung nach WCAG 2.1 (Relative Luminance / Contrast Ratio).
 *
 * Arbeitet direkt auf den HSL-Strings der Design-Tokens, damit die
 * Uebersichtsseite dieselben Werte prueft, die auch im CSS stehen.
 */

export type Hsl = { h: number; s: number; l: number };

/** Parst einen Token-Wert der Form "38 42% 76%". */
export function parseHsl(value: string): Hsl {
  const parts = value.trim().split(/\s+/);

  if (parts.length !== 3) {
    throw new Error(`Ungueltiger HSL-Token: "${value}"`);
  }

  const h = Number.parseFloat(parts[0]);
  const s = Number.parseFloat(parts[1]);
  const l = Number.parseFloat(parts[2]);

  if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)) {
    throw new Error(`Ungueltiger HSL-Token: "${value}"`);
  }

  return { h, s: s / 100, l: l / 100 };
}

/** HSL nach sRGB, jede Komponente im Bereich 0..1. */
export function hslToRgb({ h, s, l }: Hsl): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  const m = l - c / 2;

  const [r, g, b] =
    hPrime < 1
      ? [c, x, 0]
      : hPrime < 2
        ? [x, c, 0]
        : hPrime < 3
          ? [0, c, x]
          : hPrime < 4
            ? [0, x, c]
            : hPrime < 5
              ? [x, 0, c]
              : [c, 0, x];

  return [r + m, g + m, b + m];
}

/** Gamma-Korrektur einer einzelnen sRGB-Komponente. */
function linearize(channel: number): number {
  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

/** Relative Luminanz nach WCAG. */
export function relativeLuminance(value: string): number {
  const [r, g, b] = hslToRgb(parseHsl(value)).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrastverhaeltnis zweier Token-Werte, immer >= 1. */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);

  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastRequirement =
  | "text"
  | "large-text"
  | "ui"
  | "decorative";

/**
 * "decorative" ist kein Freibrief.
 *
 * Es steht ausschliesslich fuer Elemente, deren Bedeutung an derselben Stelle
 * zusaetzlich im Text steht - ein Akzentbalken neben der Beschriftung
 * "Ursprünglicher Brief", ein Trenner zwischen zwei ohnehin beschrifteten
 * Abschnitten. WCAG 1.4.11 verlangt 3:1 fuer Bedienelemente und fuer
 * grafische Objekte, die zum Verstaendnis noetig sind; rein redundante
 * Zierlinien fallen nicht darunter.
 *
 * Der Wert wird trotzdem berechnet und im Bericht ausgewiesen. Wer eine
 * Kombination hierher einordnet, muss begruenden, wo die Bedeutung sonst
 * steht - sonst ist es eine gelockerte Pruefung.
 */
export const CONTRAST_THRESHOLDS: Record<ContrastRequirement, number> = {
  text: 4.5,
  "large-text": 3,
  ui: 3,
  decorative: 1,
};

/** Rundet kaufmaennisch auf zwei Stellen, damit 4,499 nicht als 4,5 durchgeht. */
export function roundRatio(ratio: number): number {
  return Math.floor(ratio * 100) / 100;
}

export function passesContrast(
  ratio: number,
  requirement: ContrastRequirement,
): boolean {
  return roundRatio(ratio) >= CONTRAST_THRESHOLDS[requirement];
}

export function formatRatio(ratio: number): string {
  return `${roundRatio(ratio).toFixed(2).replace(".", ",")}:1`;
}
