import "server-only";

import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/auth";

import { decideAccess } from "./access";

/**
 * Der massgebliche Zugriffsschutz.
 *
 * Die Middleware sieht nur, ob ueberhaupt ein Sitzungs-Cookie mitkommt. Ob die
 * Sitzung gilt und ob das Konto gesperrt ist, weiss allein die Datenbank - und
 * das wird hier bei jeder Anfrage frisch geprueft, nicht einmal beim Anmelden.
 *
 * Die Regel selbst steht in access.ts und ist dort ohne Server pruefbar.
 */

export type ActiveSession = Session & {
  user: NonNullable<Session["user"]>;
};

export { decideAccess } from "./access";
export type { AccessDecision, SessionLike } from "./access";

/**
 * Verlangt eine gueltige Sitzung eines nicht gesperrten Kontos.
 *
 * Ohne Sitzung geht es zur Anmeldung, bei Sperre zur Sperrseite. In beiden
 * Faellen sieht der Nutzer einen erklaerten Zustand - im Altsystem blieb an
 * dieser Stelle eine leere Seite stehen.
 */
export async function requireActiveUser(
  pathname: string,
): Promise<ActiveSession> {
  const session = await auth();
  const decision = decideAccess(session, pathname);

  if (decision.type === "redirect") {
    redirect(decision.to);
  }

  if (!session?.user?.id) {
    // Kann nur eintreten, wenn pathname nicht als geschuetzt gilt. Dann ist
    // der Aufruf von requireActiveUser selbst der Fehler und kein Zustand,
    // den ein Nutzer ausloesen kann.
    throw new Error(
      `requireActiveUser fuer "${pathname}" aufgerufen, aber die Route steht nicht in PROTECTED_ROUTES.`,
    );
  }

  return session as ActiveSession;
}

/** Wie requireActiveUser, zusaetzlich beschraenkt auf Moderation und Verwaltung. */
export async function requireModerator(
  pathname: string,
): Promise<ActiveSession> {
  const session = await requireActiveUser(pathname);

  if (session.user.role !== "moderator" && session.user.role !== "admin") {
    redirect("/");
  }

  return session;
}

/**
 * Liest die Sitzung, ohne umzuleiten.
 * Fuer Seiten, die angemeldet und abgemeldet je einen sinnvollen Zustand haben.
 */
export async function getOptionalSession(): Promise<Session | null> {
  return auth();
}
