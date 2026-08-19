"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { checkAndRecord } from "@/lib/auth/rate-limit";

/**
 * Serveraktion fuer den Anmeldelink.
 *
 * Die Ratenbegrenzung sitzt hier und nicht im Auth.js-Callback, weil nur an
 * dieser Stelle die IP-Adresse der Anfrage zur Verfuegung steht.
 */

export type LoginFormState = {
  status: "idle" | "error";
  message?: string;
  email?: string;
};

/** Bewusst schlicht: ein Zeichen vor dem @, ein Punkt danach. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Liest die IP aus den Proxy-Kopfzeilen.
 *
 * Diese Kopfzeilen kann ein Client faelschen, wenn kein vertrauenswuerdiger
 * Proxy davor haengt. Die IP-Grenze ist deshalb die schwaechere der beiden -
 * die Grenze pro Adresse traegt die eigentliche Last.
 */
async function clientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }

  return headerList.get("x-real-ip");
}

function describeWait(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "einer Minute" : `${minutes} Minuten`;
}

export async function requestMagicLink(
  _previous: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";
  const weiter = formData.get("weiter");
  const redirectTo =
    typeof weiter === "string" && weiter.startsWith("/") ? weiter : "/anomail-id";

  if (!email) {
    return {
      status: "error",
      message: "Trag deine E-Mail-Adresse ein, damit wir dir den Link schicken können.",
      email,
    };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return {
      status: "error",
      message:
        "Diese Adresse können wir nicht lesen. Prüfe die Schreibweise, zum Beispiel name@beispiel.de.",
      email,
    };
  }

  let limit: Awaited<ReturnType<typeof checkAndRecord>>;

  try {
    limit = await checkAndRecord({ email, ip: await clientIp() });
  } catch (error) {
    console.error("[login] Ratenbegrenzung nicht prüfbar", error);
    return {
      status: "error",
      message:
        "Wir konnten die Anfrage gerade nicht bearbeiten. Versuch es in einem Moment noch einmal.",
      email,
    };
  }

  if (!limit.allowed) {
    const wait = describeWait(limit.retryAfterSeconds ?? 900);

    return {
      status: "error",
      message:
        limit.scope === "email"
          ? `Für diese Adresse sind gerade mehrere Links unterwegs. Sieh im Postfach und im Spam-Ordner nach, oder versuch es in ${wait} erneut.`
          : `Von deinem Anschluss kamen gerade viele Anfragen. Versuch es in ${wait} erneut.`,
      email,
    };
  }

  try {
    await signIn("email", { email, redirectTo, redirect: true });
  } catch (error) {
    // signIn wirft bei Erfolg eine Weiterleitung. Die muss durch.
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("[login] Versand des Anmeldelinks gescheitert", error);

    if (error instanceof AuthError) {
      return {
        status: "error",
        message:
          "Der Link konnte nicht verschickt werden. Prüfe die Adresse und versuch es noch einmal.",
        email,
      };
    }

    return {
      status: "error",
      message:
        "Der Link konnte nicht verschickt werden. Versuch es noch einmal oder melde dich über die Kontaktseite.",
      email,
    };
  }

  return { status: "idle", email };
}

/** Next.js signalisiert Weiterleitungen ueber einen geworfenen Fehler. */
function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
