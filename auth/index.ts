import "server-only";

import NextAuth from "next-auth";
import type { EmailConfig } from "next-auth/providers";

import { anomailAdapter, type AnomailAdapterUser } from "@/lib/auth/adapter";
import { createMailer } from "@/lib/auth/mailer";

/** Wie lange ein Anmeldelink gilt. Kurz genug, damit eine alte Mail wertlos ist. */
export const MAGIC_LINK_MAX_AGE_SECONDS = 15 * 60;

/** Laufzeit einer Sitzung. */
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * Magic-Link-Provider ohne Nodemailer.
 *
 * Der Versand geht ueber die eigene Mailer-Schnittstelle, damit die Umsetzung
 * austauschbar bleibt und keine Bibliothek fest verdrahtet ist.
 */
const magicLink: EmailConfig = {
  id: "email",
  type: "email",
  name: "E-Mail",
  from: process.env.AUTH_EMAIL_FROM ?? "anmeldung@anomail.local",
  maxAge: MAGIC_LINK_MAX_AGE_SECONDS,
  options: {},
  async sendVerificationRequest({ identifier, url, expires }) {
    await createMailer().sendMagicLink({
      to: identifier,
      url,
      expiresAt: expires,
    });
  },
};

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: anomailAdapter(),

  /**
   * Datenbank-Sitzungen, ausdruecklich kein JWT.
   *
   * Ein ausgestelltes JWT bleibt bis zum Ablauf gueltig. Ein gesperrtes Konto
   * koennte damit weiterschreiben, bis das Token von selbst verfaellt. Bei
   * Datenbank-Sitzungen wird die Nutzerzeile bei jeder Anfrage frisch gelesen
   * und die Sperre wirkt sofort.
   */
  session: {
    strategy: "database",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },

  providers: [magicLink],

  pages: {
    signIn: "/login",
    verifyRequest: "/login/check",
    error: "/login/error",
  },

  callbacks: {
    /**
     * Baut die Session, die beim Client landet.
     *
     * Sie wird hier vollstaendig neu zusammengesetzt statt ergaenzt. Wuerde
     * man das Vorhandene durchreichen, traege sie die E-Mail-Adresse mit -
     * und die hat im Client eines anonymen Dienstes nichts verloren.
     */
    session({ session, user }) {
      const anomailUser = user as AnomailAdapterUser;

      return {
        expires: session.expires,
        user: {
          id: anomailUser.id,
          anomailId: anomailUser.anomailId,
          role: anomailUser.role,
          isBanned: anomailUser.bannedAt !== null,
        },
      };
    },
  },
});

declare module "next-auth" {
  /** Die Session traegt bewusst keine E-Mail-Adresse. */
  interface Session {
    user: {
      id: string;
      anomailId: string;
      role: "user" | "moderator" | "admin";
      isBanned: boolean;
    };
  }
}
