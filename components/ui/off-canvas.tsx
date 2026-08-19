"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import * as React from "react";

import { buttonVariants } from "@/components/ui/button-variants";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type OffCanvasProps = {
  /** Beschriftung des ausloesenden Knopfs. */
  triggerLabel?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Off-Canvas-Menue.
 *
 * Fokus-Trap, aria-modal, Escape zum Schliessen und die Rueckgabe des Fokus
 * an den Ausloeser kommen aus Radix Dialog. Das Panel ist als <nav>
 * ausgezeichnet, weil es die Hauptnavigation traegt.
 */
export function OffCanvas({
  triggerLabel = "Menü öffnen",
  title,
  description,
  children,
  open,
  onOpenChange,
}: OffCanvasProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Trigger
        className={cn(buttonVariants({ variant: "secondary" }), "px-4")}
      >
        <Icon icon={Menu} />
        {triggerLabel}
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/50 animate-overlay-in motion-reduce:animate-none" />

        <DialogPrimitive.Content
          aria-modal="true"
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-full max-w-prose flex-col",
            "border-r border-input bg-card",
            "animate-sheet-in motion-reduce:animate-none",
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border p-6">
            <div>
              <DialogPrimitive.Title className="text-title text-card-foreground">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description
                className={cn(
                  description ? "mt-2 text-small text-muted-foreground" : "sr-only",
                )}
              >
                {description ?? "Navigation und Einstellungen"}
              </DialogPrimitive.Description>
            </div>

            <DialogPrimitive.Close
              className={cn(buttonVariants({ variant: "tertiary" }), "px-3")}
            >
              <Icon icon={X} />
              Schließen
            </DialogPrimitive.Close>
          </div>

          <nav aria-label="Hauptnavigation" className="flex-1 overflow-y-auto p-6">
            {children}
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type OffCanvasLinkProps = {
  href: string;
  children: React.ReactNode;
  current?: boolean;
};

export function OffCanvasLink({ href, children, current }: OffCanvasLinkProps) {
  return (
    <a
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "focus-ring hit-area flex items-center rounded-lg px-4 text-body transition-colors duration-fast",
        current
          ? "bg-secondary font-semibold text-primary"
          : "text-card-foreground hover:bg-secondary",
      )}
    >
      {children}
    </a>
  );
}
