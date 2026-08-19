import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { anomailAdapter, type AnomailAdapterUser } from "@/lib/auth/adapter";
import { decideAccess } from "@/lib/auth/access";
import {
  MODERATION_ROUTES,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
  SUSPENDED_ROUTE,
} from "@/lib/auth/routes";
import { closePools } from "@/lib/db/client";

import { startTestDatabase, truncateAll, type TestDatabase } from "../db/harness";

/**
 * Eine Sperre muss sofort wirken, nicht erst beim naechsten Anmelden.
 *
 * Deshalb Datenbank-Sitzungen: der Adapter liest die Nutzerzeile bei jeder
 * Anfrage frisch. Hier wird beides geprueft - dass der Sperrzustand ueberhaupt
 * in der Session ankommt, und dass er auf jeder einzelnen geschuetzten Route
 * greift.
 */

let database: TestDatabase;
let owner: Client;

beforeAll(async () => {
  database = await startTestDatabase();
  owner = new Client({ connectionString: database.ownerUrl });
  await owner.connect();

  process.env.DATABASE_URL = database.ownerUrl;
  process.env.DATABASE_URL_APP = database.appUrl;
});

afterAll(async () => {
  await closePools();
  await owner?.end();
  await database?.stop();
});

beforeEach(async () => {
  await truncateAll(owner);
});

/** Legt Nutzer und gueltige Sitzung direkt an, an der Anmeldung vorbei. */
async function createUserWithSession(options: {
  email: string;
  anomailId: string;
  role?: "user" | "moderator" | "admin";
  banned?: boolean;
}): Promise<{ userId: string; sessionToken: string }> {
  const { rows } = await owner.query<{ id: string }>(
    `INSERT INTO users (email, anomail_id, role, banned_at, banned_reason)
     VALUES ($1, $2, $3::user_role, $4, $5)
     RETURNING id`,
    [
      options.email,
      options.anomailId,
      options.role ?? "user",
      options.banned ? new Date() : null,
      options.banned ? "Testsperre" : null,
    ],
  );

  const sessionToken = `test-session-${options.anomailId}`;

  await owner.query(
    `INSERT INTO sessions (session_token, user_id, expires)
     VALUES ($1, $2, now() + interval '30 days')`,
    [sessionToken, rows[0].id],
  );

  return { userId: rows[0].id, sessionToken };
}

/** Baut die Client-Session genau so, wie der session-Callback in /auth es tut. */
function toClientSession(user: AnomailAdapterUser) {
  return {
    expires: new Date(Date.now() + 86_400_000).toISOString(),
    user: {
      id: user.id,
      anomailId: user.anomailId,
      role: user.role,
      isBanned: user.bannedAt !== null,
    },
  };
}

describe("3 - Gesperrtes Konto", () => {
  test("der Sperrzustand steht trotz gueltiger Sitzung in der Session", async () => {
    const { sessionToken } = await createUserWithSession({
      email: "gesperrt@example.test",
      anomailId: "AN-BBBB-5555",
      banned: true,
    });

    const adapter = anomailAdapter();
    const found = await adapter.getSessionAndUser!(sessionToken);

    expect(found).not.toBeNull();
    // Die Sitzung selbst gilt weiter - abgewiesen wird ueber den Zustand,
    // nicht dadurch, dass die Sitzung verschwindet.
    expect(found!.session.sessionToken).toBe(sessionToken);
    expect((found!.user as AnomailAdapterUser).bannedAt).not.toBeNull();

    const session = toClientSession(found!.user as AnomailAdapterUser);
    expect(session.user.isBanned).toBe(true);
  });

  test("wird auf JEDER geschuetzten Route auf die Sperrseite geleitet", async () => {
    const { sessionToken } = await createUserWithSession({
      email: "gesperrt-alle@example.test",
      anomailId: "AN-CCCC-6666",
      role: "admin",
      banned: true,
    });

    const found = await anomailAdapter().getSessionAndUser!(sessionToken);
    const session = toClientSession(found!.user as AnomailAdapterUser);

    // Auch Unterpfade, denn /conversation/:id muss ebenso greifen.
    const routes = [
      ...PROTECTED_ROUTES,
      ...MODERATION_ROUTES,
      "/conversation/7a1c9f4e-0000-4000-8000-000000000000",
      "/settings/benachrichtigungen",
    ];

    for (const route of routes) {
      const decision = decideAccess(session,route);

      expect(
        decision,
        `Route ${route} weist ein gesperrtes Konto nicht ab`,
      ).toEqual({
        type: "redirect",
        to: SUSPENDED_ROUTE,
        reason: "gesperrt",
      });
    }

    // Die Rolle admin aendert daran nichts: die Sperre wiegt schwerer.
    expect(session.user.role).toBe("admin");
  });

  test("ein nicht gesperrtes Konto kommt auf denselben Routen durch", async () => {
    const { sessionToken } = await createUserWithSession({
      email: "aktiv@example.test",
      anomailId: "AN-DDDD-7777",
      role: "moderator",
    });

    const found = await anomailAdapter().getSessionAndUser!(sessionToken);
    const session = toClientSession(found!.user as AnomailAdapterUser);

    for (const route of [...PROTECTED_ROUTES, ...MODERATION_ROUTES]) {
      expect(
        decideAccess(session,route),
        `Route ${route} weist ein aktives Konto faelschlich ab`,
      ).toEqual({ type: "allow" });
    }
  });

  test("ohne Sitzung fuehrt jede geschuetzte Route zur Anmeldung, nie ins Leere", async () => {
    for (const route of [...PROTECTED_ROUTES, ...MODERATION_ROUTES]) {
      const decision = decideAccess(null, route);

      expect(decision.type).toBe("redirect");
      if (decision.type === "redirect") {
        expect(decision.reason).toBe("keine-sitzung");
        expect(decision.to.startsWith("/login")).toBe(true);
      }
    }
  });

  test("oeffentliche Seiten bleiben ohne Sitzung erreichbar", () => {
    for (const route of PUBLIC_ROUTES) {
      expect(decideAccess(null, route), route).toEqual({ type: "allow" });
    }
  });

  test("ein gewoehnliches Konto kommt nicht in die Moderation", async () => {
    const { sessionToken } = await createUserWithSession({
      email: "normal@example.test",
      anomailId: "AN-FFFF-8888",
    });

    const found = await anomailAdapter().getSessionAndUser!(sessionToken);
    const session = toClientSession(found!.user as AnomailAdapterUser);

    expect(decideAccess(session,"/moderation")).toEqual({
      type: "redirect",
      to: "/",
      reason: "keine-moderation",
    });
  });
});
