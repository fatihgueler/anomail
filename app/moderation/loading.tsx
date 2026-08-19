import { QueueSkeleton } from "./shared";

/**
 * Ladezustand fuer jeden Bereich. Skeleton, kein Spinner.
 *
 * Bewusst ohne eigenes <main>: die Hauptbereichs-Landmarke steht im Layout
 * und ueberdauert den Austausch von Geruest gegen Seite. Ein <main> hier
 * ergaebe waehrend des Streamings kurzzeitig zwei Hauptbereiche mit derselben
 * ID.
 */
export default function ModerationLoading() {
  return <QueueSkeleton />;
}
