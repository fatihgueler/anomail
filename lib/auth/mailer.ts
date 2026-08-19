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

  throw new Error(
    `Unbekannter MAIL_TRANSPORT "${transport}". Bekannt ist derzeit nur "console".`,
  );
}

/** Nur fuer Tests: setzt die zwischengespeicherte Umsetzung zurueck. */
export function resetMailer(replacement?: Mailer): void {
  mailer = replacement;
}
