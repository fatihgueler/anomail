import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { Icon } from "@/components/ui/icon";
import { requireActiveUser } from "@/lib/auth/guard";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Brief abgeschickt",
};

export default async function SentPage() {
  await requireActiveUser("/sent");

  return (
    <main id="hauptinhalt" className="mx-auto flex max-w-shell flex-col gap-8 p-8">
      <div className="flex max-w-prose items-start gap-4">
        <span className="mt-1 text-primary">
          <Icon icon={MailCheck} />
        </span>

        <div className="flex flex-col gap-3">
          <h1 className="text-display">Dein Brief ist unterwegs</h1>
          <p className="text-body text-muted-foreground">
            Er wird als Nächstes einer Person zugeteilt, die ihn liest und dir
            antwortet. Wie lange das dauert, hängt davon ab, wie viele gerade
            mitlesen. Es können Stunden sein, manchmal auch länger.
          </p>
          <p className="text-body text-muted-foreground">
            Sobald eine Antwort da ist, findest du sie unter deinen Briefen.
          </p>
        </div>
      </div>

      {/* Kein Primär-Button: hier gibt es nichts zu erledigen. */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/my-letters"
          className={cn(buttonVariants({ variant: "secondary" }))}
        >
          Meine Briefe
        </Link>

        <Link href="/" className={cn(buttonVariants({ variant: "tertiary" }))}>
          Zur Startseite
        </Link>
      </div>
    </main>
  );
}
