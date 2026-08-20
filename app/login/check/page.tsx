import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { NoticeBanner } from "@/components/ui/notice-banner";

export const metadata: Metadata = {
  title: "Link verschickt",
};

export default function CheckMailPage() {
  return (
    <main id="hauptinhalt" className="mx-auto flex w-full max-w-narrow flex-col gap-8 px-4 py-20 sm:px-6">
      <div className="flex items-start gap-4">
        <span className="mt-1 text-primary">
          <Icon icon={MailCheck} />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-display">Wir haben dir einen Link geschickt</h1>
          <p className="text-body text-muted-foreground">
            Öffne die E-Mail und klick auf den Link. Danach bist du angemeldet.
            Der Link gilt 15 Minuten und lässt sich nur einmal benutzen.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Es kommt keine Mail an?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3 text-body text-muted-foreground">
            <li>
              Sieh im Spam-Ordner nach. Anmeldelinks landen dort besonders oft.
            </li>
            <li>
              Prüfe die Schreibweise deiner Adresse. Ein Tippfehler schickt die
              Mail an jemand anderen.
            </li>
            <li>
              Warte einen Moment. Manche Anbieter stellen mit ein paar Minuten
              Verzögerung zu.
            </li>
          </ul>
        </CardContent>
      </Card>

      <NoticeBanner tone="hinweis" title="Nichts davon hat geholfen">
        <p>
          Fordere den Link{" "}
          <Link
            href="/login"
            className="focus-ring rounded-md text-primary underline underline-offset-4"
          >
            noch einmal an
          </Link>
          . Kommt weiterhin nichts an, melde dich über die{" "}
          <Link
            href="/contact"
            className="focus-ring rounded-md text-primary underline underline-offset-4"
          >
            Kontaktseite
          </Link>
          .
        </p>
      </NoticeBanner>
    </main>
  );
}
