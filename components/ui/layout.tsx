import { cn } from "@/lib/utils";

/**
 * Container und Section.
 *
 * Die eine Stelle, an der die Seitenbreite und der Abschnittsrhythmus stehen.
 * Vorher richtete jede Seite sich selbst aus - /login zentriert, /help
 * linksbuendig, die Startseite wieder anders. Ab hier teilen sich alle Seiten
 * sichtbar dasselbe Raster.
 */

type Breite = "shell" | "prose" | "narrow";

const BREITE: Record<Breite, string> = {
  shell: "max-w-shell",
  prose: "max-w-prose",
  narrow: "max-w-narrow",
};

export function Container({
  breite = "shell",
  className,
  children,
}: {
  breite?: Breite;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6", BREITE[breite], className)}>
      {children}
    </div>
  );
}

/**
 * Abschnittsrhythmus.
 *
 * Drei Stufen statt gleichmaessiger Polsterung ueberall: der Hero atmet, ein
 * gewoehnlicher Abschnitt haelt Abstand, ein angehaengter Abschnitt rueckt
 * naeher an den vorigen heran. Das ist der Rhythmus, der vorher fehlte.
 */
type Abstand = "eng" | "normal" | "weit";

const ABSTAND: Record<Abstand, string> = {
  eng: "py-10 sm:py-12",
  normal: "py-16 sm:py-20 lg:py-24",
  weit: "py-20 sm:py-28 lg:py-32",
};

type SectionProps = {
  abstand?: Abstand;
  breite?: Breite;
  /** Invertiertes Feld auf der Pultfarbe. */
  pult?: boolean;
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">;

export function Section({
  abstand = "normal",
  breite = "shell",
  pult = false,
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <section
      className={cn(
        ABSTAND[abstand],
        pult && "bg-desk text-desk-foreground",
        className,
      )}
      {...rest}
    >
      <Container breite={breite}>{children}</Container>
    </section>
  );
}

/**
 * Die Falz.
 *
 * Trennt Abschnitte, wo eine Linie noetig ist. Kein Strich, sondern ein Knick -
 * die Klasse steht in globals.css. aria-hidden, weil sie nichts bedeutet, was
 * nicht auch in den Ueberschriften steht.
 */
export function Falz({ className }: { className?: string }) {
  return <hr aria-hidden="true" className={cn("falz", className)} />;
}

/**
 * Beschriftung ueber einer Ueberschrift.
 *
 * Klein, gesperrt, in der zweiten Tinte. Benennt, worum es im Abschnitt geht,
 * damit die Serif-Ueberschrift darunter kurz bleiben kann.
 */
export function Ueberschrift({
  augenbraue,
  children,
  className,
  als: Als = "h2",
  id,
}: {
  augenbraue?: string;
  children: React.ReactNode;
  className?: string;
  als?: "h1" | "h2" | "h3";
  id?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {augenbraue ? (
        <span className="font-sans text-label uppercase tracking-[0.14em] text-accent">
          {augenbraue}
        </span>
      ) : null}
      <Als id={id} className={Als === "h1" ? "text-display" : "text-title"}>
        {children}
      </Als>
    </div>
  );
}
