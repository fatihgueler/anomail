import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { Compass } from "lucide-react";

export const metadata: Metadata = {
  title: "Seite nicht gefunden",
  description: "Diese Adresse führt zu keiner Seite von Anomail.",
};

/**
 * 404.
 *
 * Ohne diese Datei liefert Next.js eine englische Standardseite aus - genau
 * der Zustand, den der Altbestand hatte.
 */
export default function NotFound() {
  return (
    <main id="hauptinhalt" className="mx-auto flex w-full max-w-shell flex-col gap-8 px-4 py-16 sm:px-6">
      <h1 className="text-display">Diese Seite gibt es nicht</h1>

      <div className="max-w-prose">
        <EmptyState
          icon={Compass}
          title="Die Adresse führt ins Leere."
          description="Vielleicht hat sich ein Tippfehler eingeschlichen, oder die Seite wurde entfernt. Von der Startseite aus kommst du überall hin."
          action={
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "whitespace-nowrap",
              )}
            >
              Zur Startseite
            </Link>
          }
        />
      </div>

      <nav aria-label="Weitere Seiten" className="max-w-prose">
        <ul className="flex flex-wrap gap-4">
          {[
            { href: "/help", label: "Hilfe" },
            { href: "/contact", label: "Kontakt" },
            { href: "/privacy", label: "Datenschutz" },
          ].map((eintrag) => (
            <li key={eintrag.href}>
              <Link
                href={eintrag.href}
                className="focus-ring hit-area inline-flex items-center rounded-lg px-3 text-body text-primary underline underline-offset-4"
              >
                {eintrag.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
