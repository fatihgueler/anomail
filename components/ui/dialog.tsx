"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertTriangle, Info, LifeBuoy } from "lucide-react";
import * as React from "react";

import { buttonVariants } from "@/components/ui/button-variants";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/*
 * Radix uebernimmt Fokus-Trap, aria-modal, Escape und die Rueckgabe des Fokus
 * an das ausloesende Element. Die Varianten unterscheiden sich nur in Symbol,
 * Randfarbe und Fussleiste, nicht in der Mechanik.
 */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-40 bg-foreground/50 animate-overlay-in motion-reduce:animate-none",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

export type DialogVariant = "confirm" | "notice" | "crisis";

const VARIANT_ICON: Record<DialogVariant, typeof Info> = {
  confirm: AlertTriangle,
  notice: Info,
  crisis: LifeBuoy,
};

const VARIANT_ACCENT: Record<DialogVariant, string> = {
  confirm: "border-t-accentbar border-t-input",
  notice: "border-t-accentbar border-t-primary",
  crisis: "border-t-accentbar border-t-accent",
};

type AppDialogProps = {
  variant: DialogVariant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children?: React.ReactNode;
  /** Nur bei variant "confirm" auszuwerten. */
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Bei "notice" und "crisis" die Beschriftung des einzigen Knopfs. */
  dismissLabel?: string;
  /** Kennzeichnet die bestaetigende Aktion als loeschend. */
  destructive?: boolean;
  /**
   * Element, das den Fokus nach dem Schliessen zurueckbekommt.
   *
   * Radix zielt von sich aus auf einen DialogTrigger. Dieser Dialog wird aber
   * ueber open/onOpenChange gesteuert und hat keinen Trigger, deshalb muss das
   * Ziel ausdruecklich uebergeben werden. Ohne diese Angabe landet der Fokus
   * nach dem Schliessen auf <body>.
   */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
};

/**
 * Eine Basis, drei Varianten.
 *
 * confirm - der Nutzer bestaetigt eine Aktion, die sich nicht zuruecknehmen laesst.
 * notice  - eine Meldung, die nur zur Kenntnis genommen wird.
 * crisis  - ein Hinweis auf Hilfsangebote, ruhig und ohne Alarmfarbe.
 */
export function AppDialog({
  variant,
  open,
  onOpenChange,
  title,
  description,
  children,
  onConfirm,
  confirmLabel = "Ja, fortfahren",
  cancelLabel = "Abbrechen",
  dismissLabel = "Verstanden",
  destructive = false,
  returnFocusRef,
}: AppDialogProps) {
  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-modal="true"
          onCloseAutoFocus={(event) => {
            if (!returnFocusRef?.current) {
              return;
            }

            event.preventDefault();
            returnFocusRef.current.focus();
          }}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-prose -translate-x-1/2 -translate-y-1/2",
            "rounded-lg border border-input bg-card p-6 shadow-card",
            "animate-dialog-in motion-reduce:animate-none",
            VARIANT_ACCENT[variant],
          )}
        >
          <div className="flex gap-4">
            <span
              className={cn(
                "mt-1",
                variant === "crisis" ? "text-foreground" : "text-primary",
              )}
            >
              <Icon icon={VARIANT_ICON[variant]} />
            </span>
            <div className="flex-1">
              <DialogPrimitive.Title className="text-title text-card-foreground">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-2 text-body text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
              {children ? <div className="mt-4">{children}</div> : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {variant === "confirm" ? (
              <>
                <DialogClose
                  className={buttonVariants({ variant: "tertiary" })}
                >
                  {cancelLabel}
                </DialogClose>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={cn(
                    buttonVariants({ variant: "primary" }),
                    destructive &&
                      "bg-destructive hover:bg-destructive-hover active:bg-destructive-active",
                  )}
                >
                  {confirmLabel}
                </button>
              </>
            ) : (
              <DialogClose className={buttonVariants({ variant: "primary" })}>
                {dismissLabel}
              </DialogClose>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
