import { handlers } from "@/auth";

/**
 * Endpunkte von Auth.js.
 *
 * Bewusst nur das Weiterreichen der Handler - jede Logik gehoert in die
 * Konfiguration unter /auth, nicht in eine Route.
 */
export const { GET, POST } = handlers;

// Der Adapter spricht ueber node-postgres mit der Datenbank. Das laeuft nicht
// in der Edge-Laufzeit.
export const runtime = "nodejs";
