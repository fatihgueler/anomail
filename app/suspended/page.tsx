import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { users } from "@/db/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppealForm } from "@/components/appeal/appeal-form";
import { loadOwnAppeals } from "@/lib/actions/appeals";
import { withUser } from "@/lib/db/client";
import { LOGIN_ROUTE } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Konto gesperrt",
};

/**
 * Seite fuer gesperrte Konten.
 *
 * Sie steht bewusst ausserhalb der geschuetzten Routen: ein gesperrter Nutzer
 * wird hierher geleitet und muss sie erreichen koennen. Ohne diese Seite
 * entstuende genau der Zustand aus dem Altsystem - eine Weiterleitung ins
 * Leere.
 */
export default async function SuspendedPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(LOGIN_ROUTE);
  }

  if (!session.user.isBanned) {
    redirect("/");
  }

  // Der Grund steht in der eigenen Nutzerzeile. Der Zugriff laeuft ueber den
  // regulaeren Nutzerkontext - die RLS-Policy users_select_self gibt genau
  // diese eine Zeile frei.
  const account = await withUser(session, async (db) => {
    const rows = await db
      .select({
        bannedAt: users.bannedAt,
        bannedReason: users.bannedReason,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return rows[0] ?? null;
  });

  // Ein bereits eingelegter Widerspruch samt Entscheidung, falls vorhanden.
  const appeals = await loadOwnAppeals(session);
  const existingAppeal =
    appeals.status === "ok"
      ? appeals.appeals.find((entry) => entry.targetType === "account")
      : undefined;

  const bannedAtLabel = account?.bannedAt
    ? new Intl.DateTimeFormat("de-DE", {
        dateStyle: "long",
      }).format(account.bannedAt)
    : null;

  return (
    <main id="hauptinhalt" className="mx-auto flex max-w-prose flex-col gap-8 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-display">Dein Konto ist gesperrt</h1>
        <p className="text-body text-muted-foreground">
          Du kannst gerade keine Briefe schreiben, lesen oder beantworten. Deine
          bestehenden Briefwechsel bleiben erhalten.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Was wir dazu festgehalten haben</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-4">
            {bannedAtLabel ? (
              <div className="flex flex-col gap-1">
                <dt className="text-label text-muted-foreground">Gesperrt seit</dt>
                <dd className="text-body">{bannedAtLabel}</dd>
              </div>
            ) : null}

            <div className="flex flex-col gap-1">
              <dt className="text-label text-muted-foreground">Begründung</dt>
              <dd className="text-body">
                {account?.bannedReason ??
                  "Es wurde keine Begründung hinterlegt. Frag über den Widerspruchsweg nach."}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <section aria-labelledby="widerspruch" className="flex flex-col gap-4">
        <h2 id="widerspruch" className="text-title">
          Du kannst der Sperre widersprechen
        </h2>

        <p className="max-w-prose text-body text-muted-foreground">
          Schildere uns, warum du die Entscheidung für falsch hältst. Wir sehen
          sie uns noch einmal an und antworten dir mit einer Begründung.
        </p>

        {/* Internes Beschwerdeverfahren nach DSA Art. 20. */}
        <AppealForm
          targetType="account"
          targetId={null}
          existingStatus={existingAppeal?.status}
          existingDecision={existingAppeal?.decisionNote}
        />

        <p className="max-w-prose text-small text-muted-foreground">
          Kommst du hier nicht weiter, erreichst du uns über die{" "}
          <Link
            href="/contact"
            className="focus-ring rounded-md text-primary underline underline-offset-4"
          >
            Kontaktseite
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
