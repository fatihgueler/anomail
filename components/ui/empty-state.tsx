import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  /** Eine einzelne, klar benannte Handlung. */
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-lg border border-dashed border-input bg-card p-8 text-center",
        className,
      )}
    >
      <span className="text-muted-foreground">
        <Icon icon={icon} />
      </span>

      <div className="flex flex-col gap-2">
        <h3 className="text-subtitle text-card-foreground">{title}</h3>
        <p className="max-w-prose text-body text-muted-foreground">
          {description}
        </p>
      </div>

      {action}
    </div>
  );
}
