import {
  LOGIN_ROUTE,
  SUSPENDED_ROUTE,
  isModerationRoute,
  requiresSession,
} from "./routes";

/**
 * Die Zugriffsentscheidung als reine Funktion.
 *
 * Bewusst getrennt vom Umleiten und ohne Abhaengigkeit zu Next.js oder
 * Auth.js. Nur so laesst sich die Regel fuer jede geschuetzte Route pruefen,
 * ohne einen Server zu starten - und Guard und Test lesen dieselbe Regel statt
 * zweier Nachbildungen voneinander.
 */

/** Was die Entscheidung von einer Sitzung braucht. */
export type SessionLike = {
  user?: {
    id?: string | null;
    role?: string | null;
    isBanned?: boolean | null;
  } | null;
} | null;

export type AccessDecision =
  | { type: "allow" }
  | {
      type: "redirect";
      to: string;
      reason: "keine-sitzung" | "gesperrt" | "keine-moderation";
    };

export function decideAccess(
  session: SessionLike,
  pathname: string,
): AccessDecision {
  if (!requiresSession(pathname)) {
    return { type: "allow" };
  }

  if (!session?.user?.id) {
    return {
      type: "redirect",
      to: `${LOGIN_ROUTE}?weiter=${encodeURIComponent(pathname)}`,
      reason: "keine-sitzung",
    };
  }

  // Vor der Rollenpruefung: eine Sperre wiegt schwerer als jede Rolle.
  // Ein gesperrter Admin ist gesperrt.
  if (session.user.isBanned) {
    return { type: "redirect", to: SUSPENDED_ROUTE, reason: "gesperrt" };
  }

  if (
    isModerationRoute(pathname) &&
    session.user.role !== "moderator" &&
    session.user.role !== "admin"
  ) {
    // Kein eigener Fehlercode: wer nicht darf, soll nicht erfahren, dass es
    // die Seite gibt.
    return { type: "redirect", to: "/", reason: "keine-moderation" };
  }

  return { type: "allow" };
}
