import { randomUUID } from "node:crypto";
import type { Metadata } from "next";

import { requireActiveUser } from "@/lib/auth/guard";

import { WriteForm } from "./write-form";

export const metadata: Metadata = {
  title: "Brief schreiben",
};

/** Jeder Aufruf der Seite bekommt eine eigene Absendekennung. */
export const dynamic = "force-dynamic";

export default async function WritePage() {
  // Massgebliche Pruefung: gueltige Sitzung, Konto nicht gesperrt.
  await requireActiveUser("/write");

  // Serverseitig vergeben, damit ein wiederholtes Absenden desselben Formulars
  // keinen zweiten Brief erzeugen kann.
  const submissionId = randomUUID();

  return (
    <main id="hauptinhalt" className="mx-auto flex w-full max-w-shell flex-col gap-8 px-4 py-16 sm:px-6">
      <div className="flex max-w-prose flex-col gap-3">
        <h1 className="text-display">Brief schreiben</h1>
        <p className="text-body text-muted-foreground">
          Schreib auf, was dich beschäftigt. Eine andere Person liest deinen
          Brief und antwortet dir. Ihr seht voneinander nur eure Anomail-ID.
        </p>
        <p className="text-small text-muted-foreground">
          Anomail ist kein Notfall- oder professioneller Krisendienst.
        </p>
      </div>

      <WriteForm submissionId={submissionId} />
    </main>
  );
}
