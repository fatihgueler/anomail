import type { Metadata } from "next";

import { loadCrisisSummary } from "@/lib/actions/moderation/queue";
import { requireModerator } from "@/lib/auth/guard";

import { ModerationNav } from "./moderation-nav";

export const metadata: Metadata = {
  title: "Moderation",
};

export const dynamic = "force-dynamic";

/**
 * Rahmen des Moderationsbereichs.
 *
 * Der Rollenschutz sitzt hier und wird bei jeder Anfrage ausgewertet, weil
 * Layouts in Next.js bei jedem Aufruf einer Unterroute neu laufen. Die
 * Server Actions pruefen zusaetzlich selbst - ein Layout schuetzt keine
 * Aktion, die direkt aufgerufen wird.
 *
 * Das <main id="hauptinhalt"> steht hier und nicht in den einzelnen Seiten.
 * Der Bereich streamt: waehrend des Ladens zeigt loading.tsx ein Geruest, das
 * spaeter durch die Seite ersetzt wird. Traegt jede Seite ihr eigenes <main>,
 * stehen im Moment des Austauschs zwei Hauptbereiche mit derselben ID im
 * Dokument - eine doppelte Landmarke und eine doppelte ID zugleich. Im Layout
 * ueberdauert die Landmarke den Austausch, und das Sprungziel bleibt
 * durchgehend gueltig.
 */
export default async function ModerationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireModerator("/moderation");
  const crisis = await loadCrisisSummary(session);

  return (
    <div className="mx-auto flex max-w-shell flex-col gap-8 p-8">
      <ModerationNav
        isAdmin={session.user.role === "admin"}
        crisisOpen={crisis.open}
        crisisOldestMinutes={crisis.oldestMinutes}
      />

      <main id="hauptinhalt" className="flex flex-col gap-8">
        {children}
      </main>
    </div>
  );
}
