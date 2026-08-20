"use client";

import type { VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { buttonVariants } from "@/components/ui/button-variants";
import { AppDialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type BaseButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Symbol vor der Beschriftung. Nie allein, immer neben Text. */
    iconLeft?: LucideIcon;
    /** Sperrt den Knopf und tauscht die Beschriftung gegen den Ladetext. */
    loading?: boolean;
    loadingLabel?: string;
    /** Fehlermeldung unter dem Knopf, etwa wenn das Senden nicht geklappt hat. */
    error?: string;
  };

type DangerButtonProps = BaseButtonProps & {
  variant: "danger";
  /**
   * Pflicht bei der Gefahr-Stufe: die Aktion laeuft erst nach einer
   * Bestaetigung im Dialog. Der Knopf selbst fuehrt nichts aus.
   */
  onConfirm: () => void;
  confirmTitle?: string;
  confirmDescription?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type SafeButtonProps = BaseButtonProps & {
  variant?: "primary" | "accent" | "secondary" | "tertiary";
  onConfirm?: never;
};

export type ButtonProps = DangerButtonProps | SafeButtonProps;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const errorId = React.useId();

    // Eigene Referenz, damit der Bestaetigungsdialog den Fokus hierher
    // zuruecklegen kann. Die von aussen uebergebene Referenz bleibt bedient.
    const innerRef = React.useRef<HTMLButtonElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLButtonElement);

    const isDanger = props.variant === "danger";
    const danger = isDanger ? (props as DangerButtonProps) : null;

    const {
      className,
      variant,
      block,
      iconLeft,
      loading = false,
      loadingLabel = "Wird geladen",
      error,
      children,
      disabled,
      onClick,
      type = "button",
      ...domProps
    } = props as BaseButtonProps;

    // Die Dialogtexte der Gefahr-Stufe gehoeren nicht auf das <button>-Element.
    const {
      onConfirm: _onConfirm,
      confirmTitle: _confirmTitle,
      confirmDescription: _confirmDescription,
      confirmLabel: _confirmLabel,
      cancelLabel: _cancelLabel,
      ...buttonAttributes
    } = domProps as Record<string, unknown>;

    const isDisabled = Boolean(disabled) || loading;

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (danger) {
        // Ohne Bestaetigung passiert hier bewusst nichts.
        event.preventDefault();
        setConfirmOpen(true);
        return;
      }

      onClick?.(event);
    };

    return (
      <span className={cn("inline-flex flex-col gap-1", block && "w-full")}>
        <button
          ref={innerRef}
          type={type}
          disabled={isDisabled}
          aria-busy={loading || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onClick={handleClick}
          className={cn(buttonVariants({ variant, block }), className)}
          {...(buttonAttributes as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {iconLeft && !loading ? <Icon icon={iconLeft} /> : null}
          <span>{loading ? loadingLabel : children}</span>
        </button>

        {error ? (
          <span
            id={errorId}
            role="alert"
            className="text-small text-destructive"
          >
            {error}
          </span>
        ) : null}

        {danger ? (
          <AppDialog
            variant="confirm"
            destructive
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            returnFocusRef={innerRef}
            title={danger.confirmTitle ?? "Bist du sicher?"}
            description={
              danger.confirmDescription ??
              "Diese Aktion lässt sich nicht rückgängig machen."
            }
            confirmLabel={danger.confirmLabel ?? "Ja, endgültig löschen"}
            cancelLabel={danger.cancelLabel ?? "Abbrechen"}
            onConfirm={danger.onConfirm}
          />
        ) : null}
      </span>
    );
  },
);
