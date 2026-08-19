/**
 * Welche Routen geschuetzt sind.
 *
 * Bewusst ohne "server-only": diese Liste ist reine Konfiguration ohne
 * Geheimnisse und wird sowohl von der Middleware als auch vom Guard gelesen.
 */

/** Nur mit Anmeldung erreichbar. */
export const PROTECTED_ROUTES = [
  "/write",
  "/sent",
  "/listen",
  "/response-sent",
  "/my-letters",
  "/conversation",
  "/notifications",
  "/anomail-id",
  "/blocked",
  "/settings",
  "/delete-account",
] as const;

/** Zusaetzlich nur fuer Moderation und Verwaltung. */
export const MODERATION_ROUTES = ["/moderation"] as const;

/** Ohne Anmeldung erreichbar. Alles andere ist im Zweifel geschuetzt. */
export const PUBLIC_ROUTES = [
  "/",
  "/privacy",
  "/terms",
  "/impressum",
  "/help",
  "/contact",
] as const;

/** Seite fuer gesperrte Konten. Muss auch gesperrten Nutzern offenstehen. */
export const SUSPENDED_ROUTE = "/suspended";

export const LOGIN_ROUTE = "/login";

function matches(pathname: string, route: string): boolean {
  // Trifft die Route selbst und alles darunter, damit /conversation/:id
  // von /conversation abgedeckt ist.
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => matches(pathname, route));
}

export function isModerationRoute(pathname: string): boolean {
  return MODERATION_ROUTES.some((route) => matches(pathname, route));
}

export function requiresSession(pathname: string): boolean {
  return isProtectedRoute(pathname) || isModerationRoute(pathname);
}
