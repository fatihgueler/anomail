import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { requireActiveUser } from "@/lib/auth/guard";

export const metadata: Metadata = {
  title: "Deine Anomail-ID",
};

export default async function AnomailIdPage() {
  // Massgebliche Pruefung: gueltige Sitzung, Konto nicht gesperrt.
  // Die Middleware hat vorher nur das Cookie gesehen.
  const session = await requireActiveUser("/anomail-id");

  return (
    <main id="hauptinhalt" className="mx-auto flex max-w-prose flex-col gap-8 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-display">Deine Anomail-ID</h1>
        <p className="text-body text-muted-foreground">
          Das ist deine Kennung bei Anomail. Sie ist das Einzige, was andere von
          dir sehen — nicht dein Name, nicht deine E-Mail-Adresse.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kennung</CardTitle>
        </CardHeader>
        <CardContent>
          <CopyField
            label="Deine Anomail-ID"
            hint="Bewahre sie auf. Wenn du uns schreibst, finden wir dich darüber wieder."
            value={session.user.anomailId}
          />
        </CardContent>
      </Card>

      <NoticeBanner tone="hinweis" title="Die ID bleibt, wie sie ist">
        <p>
          Sie wurde bei deiner ersten Anmeldung einmal vergeben und lässt sich
          nicht ändern. Löschst du dein Konto, wird sie nie wieder an jemand
          anderen vergeben.
        </p>
      </NoticeBanner>
    </main>
  );
}
