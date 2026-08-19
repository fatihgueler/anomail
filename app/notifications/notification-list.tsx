"use client";

import { MailOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { markAllReadAction, markReadAction } from "@/lib/actions/moderation-actions";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  conversationId: string;
  partnerAnomailId: string | null;
  createdAtLabel: string;
  isRead: boolean;
};

type NotificationListProps = {
  entries: NotificationItem[];
  unread: number;
};

export function NotificationList({ entries, unread }: NotificationListProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();
  const [status, setStatus] = React.useState("");

  const open = (entry: NotificationItem) => {
    setError(undefined);
    startTransition(async () => {
      // Erst als gelesen markieren, dann das Gespraech oeffnen.
      const failure = await markReadAction(entry.id);

      if (failure) {
        setError(failure);
        return;
      }

      router.push(`/conversation/${entry.conversationId}`);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {unread > 0 ? (
        <div>
          <Button
            variant="tertiary"
            iconLeft={MailOpen}
            loading={pending}
            loadingLabel="Wird gespeichert"
            className="whitespace-nowrap"
            onClick={() => {
              setError(undefined);
              startTransition(async () => {
                const failure = await markAllReadAction();

                if (failure) {
                  setError(failure);
                  return;
                }

                setStatus("Alle Benachrichtigungen sind als gelesen markiert.");
                router.refresh();
              });
            }}
          >
            Alle als gelesen markieren
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-small text-destructive">
          {error}
        </p>
      ) : null}

      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>

      <ul className="flex flex-col gap-3">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => open(entry)}
              disabled={pending}
              className={cn(
                "focus-ring hit-area flex w-full flex-col items-start gap-1 rounded-lg border p-4 text-left",
                "transition-colors duration-fast",
                // Ungelesen ist nicht nur farblich abgesetzt: es traegt
                // zusaetzlich eine Beschriftung.
                entry.isRead
                  ? "border-border bg-card hover:bg-secondary"
                  : "border-primary bg-secondary hover:bg-muted",
                "disabled:cursor-not-allowed",
              )}
            >
              <span className="flex flex-wrap items-center gap-2">
                {entry.isRead ? null : (
                  <span className="rounded-full border border-primary px-2 py-1 text-label text-primary">
                    Neu
                  </span>
                )}
                <span className="text-body text-card-foreground">
                  Neue Antwort von {entry.partnerAnomailId ?? "Unbekannt"}
                </span>
              </span>

              <span className="text-small text-muted-foreground">
                {entry.createdAtLabel}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Der Zaehler, wie ihn ein spaeteres Menue anzeigen kann. */
export function UnreadCount({ unread }: { unread: number }) {
  if (unread === 0) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary bg-secondary px-3 py-1 text-label text-primary">
      <Icon icon={MailOpen} />
      {unread} ungelesen
    </span>
  );
}
