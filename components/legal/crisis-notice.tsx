import { LifeBuoy } from "lucide-react";

import { Icon } from "@/components/ui/icon";

/**
 * Krisen-Hinweis in der Fußzeile.
 *
 * Wortlaut fest verdrahtet, er ist vorgegeben und nicht variabel.
 *
 * Aufklappbar über <details>, damit er ohne JavaScript funktioniert und die
 * Tastaturbedienung vom Browser kommt. Gesetzt in der Klein-Stufe bei vollem
 * Kontrast auf text-foreground — im Altsystem war das der am schwächsten
 * gesetzte Text der Startseite, und das war genau der falsche Text dafür.
 */

const HEADLINE = "Anomail ist kein Krisendienst";

const BODY =
  "Anomail ersetzt keine professionelle Hilfe oder Therapie. In akuten Krisen wende dich an die Notrufnummer 112 oder die Telefonseelsorge (0800 111 0 111). Du bist nicht allein.";

export function CrisisNotice() {
  return (
    <details className="rounded-lg border border-accent bg-secondary" open>
      <summary className="focus-ring hit-area flex cursor-pointer items-center gap-3 rounded-lg px-4 text-small font-semibold text-foreground">
        <Icon icon={LifeBuoy} />
        {HEADLINE}
      </summary>

      <div className="flex flex-col gap-3 px-4 pb-4">
        {/* Volle Vordergrundfarbe, kein gedämpfter Sekundärton. */}
        <p className="max-w-prose text-small text-foreground">{BODY}</p>

        <ul className="flex flex-wrap gap-3">
          <li>
            <a
              href="tel:112"
              className="focus-ring hit-area inline-flex items-center rounded-lg px-3 text-small font-semibold tabular-nums text-foreground underline underline-offset-4"
            >
              112
            </a>
          </li>
          <li>
            <a
              href="tel:08001110111"
              className="focus-ring hit-area inline-flex items-center rounded-lg px-3 text-small font-semibold tabular-nums text-foreground underline underline-offset-4"
            >
              0800 111 0 111
            </a>
          </li>
        </ul>
      </div>
    </details>
  );
}
