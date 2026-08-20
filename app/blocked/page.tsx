import type { Metadata } from "next";
import Link from "next/link";
import { ShieldOff } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { loadBlockedPeople } from "@/lib/actions/block";
import { requireActiveUser } from "@/lib/auth/guard";
import { cn } from "@/lib/utils";

import { UnblockButton } from "./unblock-button";

export const metadata: Metadata = {
  title: "Blockierte Personen",
};

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" });

export default async function BlockedPage() {
  const session = await requireActiveUser("/blocked");
  const result = await loadBlockedPeople(session);

  if (result.status === "failed") {
    return (
      <main id="hauptinhalt" className="mx-auto flex w-full max-w-shell flex-col gap-8 px-4 py-16 sm:px-6">
        <h1 className="text-display">Blockierte Personen</h1>

        <div
          role="alert"
          className="flex max-w-prose flex-col items-start gap-4 rounded-lg border border-destructive bg-card p-6"
        >
          <h2 className="text-subtitle text-card-foreground">
            Die Liste konnte nicht geladen werden
          </h2>
          <p className="text-body text-muted-foreground">{result.message}</p>
          <Link
            href="/blocked"
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
    <main id="hauptinhalt" className="mx-auto flex w-full max-w-shell flex-col gap-8 px-4 py-16 sm:px-6">
      <div className="flex max-w-prose flex-col gap-3">
        <h1 className="text-display">Blockierte Personen</h1>
        <p className="text-body text-muted-foreground">
          Mit diesen Personen tauschst du keine Nachrichten mehr aus. Ihr bekommt
          auch keine Briefe mehr voneinander zugeteilt.
        </p>
      </div>

      {result.people.length === 0 ? (
        <div className="max-w-prose">
          <EmptyState
            icon={ShieldOff}
            title="Du hast niemanden blockiert."
            description="Wenn dir jemand in einem Briefwechsel zu nahe kommt, kannst du die Person dort blockieren."
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
        <ul className="flex max-w-prose flex-col gap-4">
          {result.people.map((person) => (
            <li key={person.id}>
              <Card>
                <CardHeader>
                  <span className="text-title tabular-nums">
                    {person.anomailId ?? "Unbekannt"}
                  </span>
                </CardHeader>

                <CardContent>
                  <p className="text-small text-muted-foreground">
                    Blockiert seit {dateFormat.format(person.blockedAt)}
                  </p>
                </CardContent>

                <CardFooter>
                  <UnblockButton
                    blockedId={person.id}
                    anomailId={person.anomailId ?? "dieser Person"}
                  />
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
