import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UiGallery } from "./ui-gallery";

export const metadata: Metadata = {
  title: "Komponenten",
};

/**
 * Interne Komponenten-Übersicht.
 * Ausserhalb der Entwicklung gibt es diese Route nicht.
 */
export default function DevUiPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main id="hauptinhalt">
      <UiGallery />
    </main>
  );
}
