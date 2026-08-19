import type { Metadata } from "next";
import Link from "next/link";
import { BellOff } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { EmptyState } from "@/components/ui/empty-state";
import { loadNotifications } from "@/lib/actions/notifications";
import { requireActiveUser } from "@/lib/auth/guard";
import { cn } from "@/lib/utils";

import { NotificationList, UnreadCount } from "./notification-list";

export const metadata: Metadata = {
  title: "Benachrichtigungen",
};

export const dynamic = "force-dynamic";

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function NotificationsPage() {
  const session = await requireActiveUser("/notifications");
  const result = await loadNotifications(session);

  if (result.status === "failed") {
    return (
      <main id="hauptinhalt" className="mx-auto flex max-w-shell flex-col gap-8 p-8">
        <h1 className="text-display">Benachrichtigungen</h1>

        <div
          role="alert"
          className="flex max-w-prose flex-col items-start gap-4 rounded-lg border border-destructive bg-card p-6"
        >
          <h2 className="text-subtitle text-card-foreground">
            Deine Benachrichtigungen konnten nicht geladen werden
          </h2>
          <p className="text-body text-muted-foreground">{result.message}</p>
          <Link
            href="/notifications"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "whitespace-nowrap",
            )}
          >
            Erneut versuchen
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="hauptinhalt" className="mx-auto flex max-w-shell flex-col gap-8 p-8">
      <div className="flex max-w-prose flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-display">Benachrichtigungen</h1>
          {/* Der Zaehler entsteht beim Rendern auf dem Server, nicht durch
              wiederholtes Nachfragen aus dem Browser. */}
          <UnreadCount unread={result.unread} />
        </div>
        <p className="text-body text-muted-foreground">
          Hier siehst du, wenn jemand auf deinen Brief geantwortet hat.
        </p>
      </div>

      {result.entries.length === 0 ? (
        <div className="max-w-prose">
          <EmptyState
            icon={BellOff}
            title="Du hast noch keine Benachrichtigungen."
            description="Sobald jemand auf einen deiner Briefe antwortet, erscheint sie hier."
            action={
              <Link
                href="/my-letters"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "whitespace-nowrap",
                )}
              >
                Zu meinen Briefen
              </Link>
            }
          />
        </div>
      ) : (
        <div className="max-w-prose">
          <NotificationList
            unread={result.unread}
            entries={result.entries.map((entry) => ({
              id: entry.id,
              conversationId: entry.conversationId,
              partnerAnomailId: entry.partnerAnomailId,
              createdAtLabel: dateTimeFormat.format(entry.createdAt),
              isRead: entry.isRead,
            }))}
          />
        </div>
      )}
    </main>
  );
}
