import { Check, X } from "lucide-react";

import { Icon } from "@/components/ui/icon";
import {
  CONTRAST_THRESHOLDS,
  contrastRatio,
  formatRatio,
  passesContrast,
} from "@/lib/tokens/contrast";
import {
  CONTRAST_PAIRS,
  PALETTES,
  type ThemeName,
} from "@/lib/tokens/palette";
import { cn } from "@/lib/utils";

const THEME_LABEL: Record<ThemeName, string> = {
  light: "Hell",
  dark: "Dunkel",
};

const REQUIREMENT_LABEL = {
  text: "Text",
  "large-text": "Grosser Text",
  ui: "Bedienelement",
  // Rein zierend, Bedeutung steht zusaetzlich im Text. Der Wert wird trotzdem
  // ausgewiesen, damit er nicht aus dem Blick geraet.
  decorative: "Zierend",
} as const;

/**
 * Rechnet jede im Code verwendete Farbkombination gegen ihren Hintergrund
 * und zeigt das Ergebnis. Die Werte entstehen zur Laufzeit aus denselben
 * Token-Daten, die auch in globals.css stehen.
 */
export function ContrastTable({ theme }: { theme: ThemeName }) {
  const palette = PALETTES[theme];

  const rows = CONTRAST_PAIRS.map((pair) => {
    const ratio = contrastRatio(
      palette[pair.foreground],
      palette[pair.background],
    );

    return {
      ...pair,
      ratio,
      passed: passesContrast(ratio, pair.requirement),
    };
  });

  const failed = rows.filter((row) => !row.passed);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-subtitle">{THEME_LABEL[theme]}</h3>
        <p
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-label",
            failed.length === 0
              ? "border-primary bg-secondary text-primary"
              : "border-destructive bg-muted text-destructive",
          )}
        >
          <Icon icon={failed.length === 0 ? Check : X} />
          {failed.length === 0
            ? `${rows.length} von ${rows.length} bestanden`
            : `${failed.length} von ${rows.length} durchgefallen`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-small">
          <caption className="sr-only">
            Kontrastverhältnisse aller verwendeten Farbkombinationen im Modus{" "}
            {THEME_LABEL[theme]}
          </caption>
          <thead>
            <tr className="border-b border-input text-left">
              <th scope="col" className="p-3 text-label">
                Verwendung
              </th>
              <th scope="col" className="p-3 text-label">
                Vordergrund
              </th>
              <th scope="col" className="p-3 text-label">
                Hintergrund
              </th>
              <th scope="col" className="p-3 text-label">
                Anforderung
              </th>
              <th scope="col" className="p-3 text-label">
                Verhältnis
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.usage}-${row.foreground}-${row.background}`}
                className="border-b border-border align-top"
              >
                <th scope="row" className="p-3 text-left text-small font-normal">
                  {row.usage}
                </th>
                <td className="p-3">
                  <Swatch token={row.foreground} value={palette[row.foreground]} />
                </td>
                <td className="p-3">
                  <Swatch token={row.background} value={palette[row.background]} />
                </td>
                <td className="p-3">
                  {REQUIREMENT_LABEL[row.requirement]} ≥{" "}
                  {CONTRAST_THRESHOLDS[row.requirement]
                    .toFixed(1)
                    .replace(".", ",")}
                  :1
                </td>
                <td className="p-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 text-label tabular-nums",
                      row.passed ? "text-foreground" : "text-destructive",
                    )}
                  >
                    <Icon icon={row.passed ? Check : X} />
                    {formatRatio(row.ratio)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Swatch({ token, value }: { token: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-4 w-4 shrink-0 rounded-sm border border-input"
        style={{ backgroundColor: `hsl(${value})` }}
      />
      <code className="text-small">{token}</code>
    </span>
  );
}
