import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { Icon } from "@/components/ui/icon";
import { requireActiveUser } from "@/lib/auth/guard";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Antwort abgeschickt",
};

export default async function ResponseSentPage() {
  await requireActiveUser("/response-sent");

  return (
    <main id="hauptinhalt" className="mx-auto flex max-w-shell flex-col gap-8 p-8">
      <div className="flex max-w-prose items-start gap-4">
        <span className="mt-1 text-primary">
          <Icon icon={MailCheck} />
        </span>

        <div className="flex flex-col gap-3">
          <h1 className="text-display">Deine Antwort ist abgeschickt</h1>
          <p className="text-body text-muted-foreground">
            Die Person, die den Brief geschrieben hat, wird benachrichtigt. Ob
            sie zurückschreibt, entscheidet sie selbst.
          </p>
          <p className="text-body text-muted-foreground">
            Aus dem Brief und deiner Antwort ist ein Briefwechsel geworden. Du
            findest ihn unter deinen Briefen.
          </p>
        </div>
      </div>

      {/* Kein Primär-Button: hier gibt es nichts zu erledigen. */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/listen"
          className={cn(buttonVariants({ variant: "secondary" }))}
        >
          Nächsten Brief lesen
        </Link>

        <Link
          href="/my-letters"
          className={cn(buttonVariants({ variant: "tertiary" }))}
        >
          Meine Briefe
        </Link>
      </div>
    </main>
  );
}
