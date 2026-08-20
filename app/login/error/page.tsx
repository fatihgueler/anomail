import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Anmeldung fehlgeschlagen",
};

type ErrorPageProps = {
  searchParams: Promise<{ error?: string }>;
};

/**
 * Jeder Fall benennt, was passiert ist und was zu tun ist.
 * Keine Entschuldigungsfloskeln, keine unerklaerte Fehlernummer.
 */
const MESSAGES: Record<string, { title: string; description: string }> = {
  Verification: {
    title: "Dieser Link gilt nicht mehr",
    description:
      "Anmeldelinks laufen nach 15 Minuten ab und lassen sich nur einmal benutzen. Fordere einen neuen an.",
  },
  EmailSignin: {
    title: "Der Link konnte nicht verschickt werden",
    description:
      "Beim Versand ist etwas schiefgegangen. Prüfe deine Adresse und versuch es noch einmal.",
  },
  AccessDenied: {
    title: "Diese Anmeldung wurde abgelehnt",
    description:
      "Zu dieser Adresse können wir dich gerade nicht anmelden. Melde dich über die Kontaktseite, wenn das so bleibt.",
  },
  Configuration: {
    title: "Die Anmeldung ist gerade nicht verfügbar",
    description:
      "Auf unserer Seite stimmt etwas nicht. Versuch es später noch einmal.",
  },
};

const FALLBACK = {
  title: "Die Anmeldung hat nicht geklappt",
  description:
    "Wir konnten dich nicht anmelden. Fordere einen neuen Link an und versuch es noch einmal.",
};

export default async function LoginErrorPage({ searchParams }: ErrorPageProps) {
  const { error } = await searchParams;
  const message = (error && MESSAGES[error]) || FALLBACK;

  return (
    <main id="hauptinhalt" className="mx-auto flex w-full max-w-narrow flex-col gap-8 px-4 py-20 sm:px-6">
      <div
        role="alert"
        className="flex flex-col items-start gap-4 rounded-lg border border-destructive bg-card p-6"
      >
        <div className="flex items-start gap-3">
          <span className="mt-1 text-destructive">
            <Icon icon={AlertTriangle} />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-title text-card-foreground">{message.title}</h1>
            <p className="text-body text-muted-foreground">
              {message.description}
            </p>
          </div>
        </div>

        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "secondary" }))}
        >
          <Icon icon={RotateCcw} />
          Neuen Link anfordern
        </Link>
      </div>

      <p className="text-small text-muted-foreground">
        Bleibt es dabei, melde dich über die{" "}
        <Link
          href="/contact"
          className="focus-ring rounded-md text-primary underline underline-offset-4"
        >
          Kontaktseite
        </Link>
        .
      </p>
    </main>
  );
}
