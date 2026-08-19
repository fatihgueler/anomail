/**
 * Sprung zum Hauptinhalt.
 *
 * Erster fokussierbarer Punkt jeder Seite. Wer mit der Tastatur navigiert,
 * soll die Navigation nicht auf jeder Seite erneut durchtabben muessen.
 *
 * Bis zum Fokus aus dem sichtbaren Bereich geschoben, nicht per display:none
 * oder visibility:hidden - beides naehme dem Element die Fokussierbarkeit.
 */
export function SkipLink() {
  return (
    <a
      href="#hauptinhalt"
      className="focus-ring hit-area absolute left-4 top-0 z-50 inline-flex -translate-y-full items-center rounded-lg border border-input bg-card px-4 text-body font-semibold text-card-foreground shadow-card transition-transform duration-fast focus:translate-y-4 motion-reduce:transition-none"
    >
      Zum Hauptinhalt springen
    </a>
  );
}
