import "server-only";

/**
 * Mailversand hinter einer austauschbaren Schnittstelle.
 *
 * Die Anmeldung soll nicht wissen, wie eine Mail rausgeht. Fuer die lokale
 * Entwicklung schreibt die Konsolen-Umsetzung den Link ins Terminal; eine
 * Umsetzung fuer den Betrieb wird spaeter danebengestellt und ueber
 * MAIL_TRANSPORT ausgewaehlt.
 */

export type MagicLinkMail = {
  to: string;
  url: string;
  expiresAt: Date;
};

export interface Mailer {
  readonly name: string;
  sendMagicLink(mail: MagicLinkMail): Promise<void>;
}

/**
 * Schreibt den Anmeldelink ins Terminal.
 *
 * Ausdruecklich nur fuer die Entwicklung. Im Betrieb waere das ein
 * Anmeldelink im Serverprotokoll und damit ein uebernehmbares Konto - deshalb
 * verweigert createMailer diese Umsetzung ausserhalb der Entwicklung.
 */
export class ConsoleMailer implements Mailer {
  readonly name = "console";

  async sendMagicLink(mail: MagicLinkMail): Promise<void> {
    const lines = [
      "",
      "─".repeat(72),
      "  Anomail — Anmeldelink (nur Entwicklung)",
      `  An:       ${mail.to}`,
      `  Gültig bis: ${mail.expiresAt.toISOString()}`,
      "",
      `  ${mail.url}`,
      "─".repeat(72),
      "",
    ];

    console.info(lines.join("\n"));
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} fehlt. MAIL_TRANSPORT="smtp" braucht Host, Port, Benutzer und Passwort.`,
    );
  }

  return value;
}

/**
 * Versand ueber einen SMTP-Server.
 *
 * Bewusst anbieterneutral: Host, Port und Zugangsdaten kommen aus der
 * Umgebung, damit derselbe Code mit Mailgun, Brevo, Postmark, einem eigenen
 * Server oder was auch immer laeuft. Kein Anbieter ist fest verdrahtet.
 *
 * Die Verbindung entsteht einmal und wird wiederverwendet; nodemailer haelt
 * dafuer einen eigenen Pool.
 */
export class SmtpMailer implements Mailer {
  readonly name = "smtp";

  /**
   * Der Transport wird erst beim ersten Versand gebaut, nicht im Konstruktor.
   * Sonst braeuchte schon der Programmstart die Zugangsdaten, und ein Bau ohne
   * gesetzte Umgebung schlaege fehl.
   */
  #transport: import("nodemailer").Transporter | undefined;

  #from: string;

  constructor(from: string) {
    this.#from = from;
  }

  async #getTransport(): Promise<import("nodemailer").Transporter> {
    if (this.#transport) {
      return this.#transport;
    }

    const nodemailer = await import("nodemailer");
    const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);

    if (!Number.isFinite(port)) {
      throw new Error(`SMTP_PORT ist keine Zahl: "${process.env.SMTP_PORT}".`);
    }

    this.#transport = nodemailer.createTransport({
      host: requireEnv("SMTP_HOST"),
      port,
      // Port 465 spricht von Anfang an TLS, 587 steigt per STARTTLS um.
      // Ueberschreibbar, weil manche Anbieter davon abweichen.
      secure: process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === "true"
        : port === 465,
      auth: {
        user: requireEnv("SMTP_USER"),
        pass: requireEnv("SMTP_PASSWORD"),
      },
    });

    return this.#transport;
  }

  async sendMagicLink(mail: MagicLinkMail): Promise<void> {
    const transport = await this.#getTransport();

    const gueltigBis = new Intl.DateTimeFormat("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    }).format(mail.expiresAt);

    // Nur Text, kein HTML. Ein anonymer Dienst hat keinen Grund, in einer Mail
    // nachzuladende Bilder oder Zaehlpixel unterzubringen.
    const text = [
      "Du hast dich bei Anomail angemeldet.",
      "",
      "Mit diesem Link kommst du hinein:",
      mail.url,
      "",
      `Der Link gilt bis ${gueltigBis} Uhr und funktioniert einmal.`,
      "",
      "Hast du das nicht angefordert, ignoriere diese Mail. Dann passiert nichts.",
      "",
      "Anomail ist kein Krisendienst. In einer Notlage: Telefonseelsorge 0800 111 0 111, im Notfall 112.",
    ].join("\n");

    await transport.sendMail({
      to: mail.to,
      from: this.#from,
      subject: "Dein Anmeldelink für Anomail",
      text,
    });
  }
}

let mailer: Mailer | undefined;

/**
 * Waehlt die Umsetzung anhand von MAIL_TRANSPORT.
 *
 * Ein unbekannter Wert wirft. Ein stiller Rueckfall auf die Konsole waere der
 * gefaehrlichste Ausgang: die Anmeldung saehe erfolgreich aus, waehrend nie
 * eine Mail ankaeme.
 */
export function createMailer(): Mailer {
  if (mailer) {
    return mailer;
  }

  const transport = process.env.MAIL_TRANSPORT ?? "console";

  if (transport === "console") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        'MAIL_TRANSPORT="console" ist im Betrieb nicht zulaessig: der Anmeldelink landete im Serverprotokoll.',
      );
    }

    mailer = new ConsoleMailer();
    return mailer;
  }

  if (transport === "smtp") {
    mailer = new SmtpMailer(
      process.env.AUTH_EMAIL_FROM ?? "anmeldung@anomail.local",
    );
    return mailer;
  }

  throw new Error(
    `Unbekannter MAIL_TRANSPORT "${transport}". Bekannt sind "console" und "smtp".`,
  );
}

/** Nur fuer Tests: setzt die zwischengespeicherte Umsetzung zurueck. */
export function resetMailer(replacement?: Mailer): void {
  mailer = replacement;
}
