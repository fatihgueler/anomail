import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadNotificationPreference } from "@/lib/actions/notifications";
import { requireActiveUser } from "@/lib/auth/guard";
import { cn } from "@/lib/utils";

import { NotificationToggle } from "./notification-toggle";

export const metadata: Metadata = {
  title: "Einstellungen",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireActiveUser("/settings");
  const preference = await loadNotificationPreference(session);

  return (
    <main id="hauptinhalt" className="mx-auto flex w-full max-w-shell flex-col gap-8 px-4 py-16 sm:px-6">
      <div className="flex max-w-prose flex-col gap-3">
        <h1 className="text-display">Einstellungen</h1>
      </div>

      <section aria-labelledby="benachrichtigungen" className="max-w-prose">
        <Card>
          <CardHeader>
            <CardTitle id="benachrichtigungen">Benachrichtigungen</CardTitle>
          </CardHeader>

          <CardContent>
            {preference.status === "ok" ? (
              <NotificationToggle initial={preference.enabled} />
            ) : (
              <div role="alert" className="flex flex-col items-start gap-3">
                <p className="text-body text-muted-foreground">
                  {preference.message}
                </p>
                <Link
                  href="/settings"
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    "whitespace-nowrap",
                  )}
                >
                  Erneut versuchen
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="deine-daten" className="max-w-prose">
        <Card>
          <CardHeader>
            <CardTitle id="deine-daten">Deine Daten</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {/* Auskunftsrecht nach Art. 15 DSGVO, unmittelbar ausübbar. */}
            <p className="text-body text-muted-foreground">
              Du kannst jederzeit herunterladen, was zu deinem Konto gespeichert
              ist. Der Export enthält ausschließlich deine eigenen Daten, keine
              Nachrichten anderer Personen.
            </p>

            <div>
              <Link
                href="/api/account/export"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "whitespace-nowrap",
                )}
              >
                Daten als JSON herunterladen
              </Link>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-body text-muted-foreground">
                Wenn du Anomail nicht mehr nutzen möchtest, kannst du dein Konto
                löschen. Das geschieht sofort.
              </p>

              <div className="mt-3">
                <Link
                  href="/delete-account"
                  className={cn(
                    buttonVariants({ variant: "tertiary" }),
                    "whitespace-nowrap text-destructive hover:text-destructive-hover",
                  )}
                >
                  Konto löschen
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
