import { cn } from "@/lib/utils";

/**
 * Das Zeichen: ein gefaltetes Blatt.
 *
 * Eine durchgehende Linie, kein Fuellkoerper. Der Umschlag waere die
 * naheliegende Wahl gewesen, aber ein Umschlag verschliesst - hier geht es um
 * das Blatt darin und um die Falz, die sich durch das ganze Gestaltungssystem
 * zieht. Die diagonale Linie ist dieselbe Falz.
 *
 * currentColor, damit das Zeichen die Farbe seiner Umgebung annimmt und in
 * beiden Helligkeiten ohne zweite Fassung auskommt.
 */
export function Zeichen({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-6 w-6 shrink-0", className)}
    >
      {/* Das Blatt */}
      <path d="M5 3.5h14v17H5z" />
      {/* Die Falz: von der oberen linken Ecke zur Mitte und zurueck */}
      <path d="M5 3.5 12 12l7-8.5" />
      {/* Zwei Zeilen Schrift, angedeutet */}
      <path d="M8.5 15.5h7M8.5 18h4" />
    </svg>
  );
}

/**
 * Wortmarke.
 *
 * Zeichen plus Name in der Serif. Der Name steht bewusst nicht in Versalien
 * und nicht gesperrt - das Produkt ist leise.
 */
export function Wortmarke({
  className,
  zeichenKlasse,
}: {
  className?: string;
  zeichenKlasse?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Zeichen className={zeichenKlasse} />
      <span className="font-serif text-subtitle tracking-tight">Anomail</span>
    </span>
  );
}
