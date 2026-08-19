import { NextResponse, type NextRequest } from "next/server";

import { LOGIN_ROUTE, requiresSession } from "@/lib/auth/routes";

/**
 * Erste, billige Schicht des Zugriffsschutzes.
 *
 * Die Middleware laeuft in der Edge-Laufzeit und kann die Datenbank nicht
 * erreichen. Sie prueft deshalb nur, ob ueberhaupt ein Sitzungs-Cookie
 * mitkommt, und schickt sonst zur Anmeldung - damit niemand auf einer Seite
 * landet, die ohne Sitzung nichts anzeigen kann.
 *
 * Sie ist ausdruecklich NICHT die Sicherheitsgrenze. Ein Cookie laesst sich
 * setzen; ob die Sitzung gilt und ob das Konto gesperrt ist, entscheidet
 * requireActiveUser in lib/auth/guard.ts bei jeder Anfrage gegen die
 * Datenbank. Diese Schicht spart nur den Weg dorthin.
 */

/** Namen, unter denen Auth.js das Sitzungs-Cookie ablegt. */
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!requiresSession(pathname)) {
    return NextResponse.next();
  }

  const hasSessionCookie = SESSION_COOKIES.some(
    (name) => request.cookies.get(name)?.value,
  );

  if (hasSessionCookie) {
    return NextResponse.next();
  }

  const loginUrl = new URL(LOGIN_ROUTE, request.url);
  loginUrl.searchParams.set("weiter", `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  /**
   * Alles ausser den Auth.js-Endpunkten, statischen Dateien und Bildern.
   * Die eigentliche Auswahl trifft requiresSession - dieser Matcher haelt nur
   * offensichtlich Unbeteiligtes von der Middleware fern.
   */
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
