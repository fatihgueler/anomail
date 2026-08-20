import { Trash2 } from "lucide-react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export type ChatBubbleVariant = "eigen" | "fremd" | "original" | "geloescht";

type ChatBubbleProps = {
  variant: ChatBubbleVariant;
  /** Wer geschrieben hat, in anonymisierter Form. */
  author: string;
  timestamp: string;
  children?: React.ReactNode;
};

const VARIANT_SURFACE: Record<ChatBubbleVariant, string> = {
  eigen: "bg-primary text-primary-foreground border-primary",
  fremd: "bg-card text-card-foreground border-input",
  original: "bg-secondary text-secondary-foreground border-l-accentbar border-l-accent border-y-border border-r-border",
  geloescht: "bg-muted text-muted-foreground border-border",
};

const VARIANT_META: Record<ChatBubbleVariant, string> = {
  eigen: "text-primary-foreground",
  fremd: "text-muted-foreground",
  original: "text-muted-foreground",
  geloescht: "text-muted-foreground",
};

/**
 * Die Blase traegt die Zuordnung ueber Flaeche, Ausrichtung und Beschriftung.
 * Farbe allein entscheidet nie, wer geschrieben hat.
 */
export function ChatBubble({
  variant,
  author,
  timestamp,
  children,
}: ChatBubbleProps) {
  const isOwn = variant === "eigen";

  return (
    <article
      className={cn("flex w-full flex-col gap-1", isOwn && "items-end")}
    >
      <div
        className={cn(
          "max-w-prose rounded-lg border p-4",
          VARIANT_SURFACE[variant],
        )}
      >
        <p className={cn("text-label", VARIANT_META[variant])}>
          {variant === "original" ? `${author} · Ursprünglicher Brief` : author}
        </p>

        {variant === "geloescht" ? (
          <p className="mt-2 flex items-center gap-2 text-body italic">
            <Icon icon={Trash2} />
            Diese Nachricht wurde gelöscht.
          </p>
        ) : (
          /* Serif: das hier hat ein Mensch geschrieben. */
          <div className="brieftext mt-2 max-w-none">{children}</div>
        )}
      </div>

      <time className="text-small text-muted-foreground">{timestamp}</time>
    </article>
  );
}
