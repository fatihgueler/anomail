import type { Metadata } from "next";
import Link from "next/link";

import { CrisisNotice } from "@/components/legal/crisis-notice";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Konto gelöscht",
};

/**
 * Bestätigung nach der Kontoauflösung.
 *
 * Öffentlich erreichbar, weil es zu diesem Zeitpunkt keine Sitzung mehr gibt —
 * eine geschützte Seite würde direkt auf die Anmeldung umleiten und die
 * Bestätigung nie zeigen.
 */
export default function AccountDeletedPage() {
  return (
    <main id="hauptinhalt" className="mx-auto flex w-full max-w-shell flex-col gap-8 px-4 py-16 sm:px-6">
      <div className="flex max-w-prose flex-col gap-3">
        <h1 className="text-display">Dein Konto ist gelöscht</h1>

        <p className="text-body text-muted-foreground">
          Deine E-Mail-Adresse und deine Anomail-ID sind entfernt. Wartende
          Briefe von dir erreichen niemanden mehr, und der Text deiner
          Nachrichten ist geleert.
        </p>

        <p className="text-body text-muted-foreground">
          Bestehende Briefwechsel sind beendet. Der Verlauf bleibt für die
          jeweils andere Person lesbar, an der Stelle deiner Nachrichten steht
          ein Hinweis.
        </p>

        <p className="text-body text-muted-foreground">
          Deine Anomail-ID wird nie wieder vergeben.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "whitespace-nowrap",
          )}
        >
          Zur Startseite
        </Link>

        <Link
          href="/privacy"
          className={cn(
            buttonVariants({ variant: "tertiary" }),
            "whitespace-nowrap",
          )}
        >
          Datenschutz
        </Link>
      </div>

      <div className="max-w-prose">
        <CrisisNotice />
      </div>
    </main>
  );
}
