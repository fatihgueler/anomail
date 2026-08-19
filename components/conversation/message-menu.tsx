"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Trash2 } from "lucide-react";
import * as React from "react";

import { AppDialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Aktionsmenue an einer einzelnen Nachricht.
 *
 * Im Altsystem hingen "Loeschen" und "Melden" als winzige graue Textlinks
 * unter den Blasen, auf Touch-Geraeten weit unter 44x44px. Hier oeffnet ein
 * Ausloeser mit voller Trefferflaeche ein Menue.
 *
 * Der Aufbau ist absichtlich offen gehalten: weitere Eintraege kommen als
 * zusaetzliche MessageMenuItem-Kinder dazu, ohne dass an dieser Komponente
 * etwas umgebaut werden muss. Der Melden-Eintrag aus AP7 haengt sich genau so
 * ein.
 */

type MessageMenuProps = {
  /** Woran sich das Menue bezieht, fuer Screenreader. */
  label: string;
  children: React.ReactNode;
};

export function MessageMenu({ label, children }: MessageMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "focus-ring hit-area inline-flex items-center justify-center rounded-md",
          "text-muted-foreground transition-colors duration-fast",
          "hover:bg-secondary hover:text-foreground",
          "data-[state=open]:bg-secondary data-[state=open]:text-foreground",
        )}
      >
        <Icon icon={MoreVertical} />
        <span className="sr-only">{label}</span>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className={cn(
            "z-50 min-w-touch rounded-lg border border-input bg-card p-1 shadow-card",
            "animate-overlay-in motion-reduce:animate-none",
          )}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

type MessageMenuItemProps = {
  onSelect: () => void;
  /** Hebt zerstoerende Eintraege ab, ohne allein auf Farbe zu setzen. */
  destructive?: boolean;
  children: React.ReactNode;
};

export function MessageMenuItem({
  onSelect,
  destructive = false,
  children,
}: MessageMenuItemProps) {
  return (
    <DropdownMenu.Item
      onSelect={(event) => {
        // Radix schliesst das Menue selbst; das Verhindern der Vorgabe haelt
        // den Fokus beisammen, bis der Dialog uebernimmt.
        event.preventDefault();
        onSelect();
      }}
      className={cn(
        "focus-ring hit-area flex cursor-pointer items-center gap-2 rounded-md px-3 text-body",
        "outline-none transition-colors duration-fast",
        destructive
          ? "text-destructive data-[highlighted]:bg-secondary data-[highlighted]:text-destructive-hover"
          : "text-card-foreground data-[highlighted]:bg-secondary",
      )}
    >
      {children}
    </DropdownMenu.Item>
  );
}

type DeleteMessageItemProps = {
  onConfirm: () => void;
};

/**
 * Der Loeschen-Eintrag samt Bestaetigung.
 *
 * Die Bestaetigung liegt hier und nicht beim Aufrufer, damit kein Weg
 * entsteht, auf dem eine Nachricht ohne Rueckfrage verschwindet.
 */
export function DeleteMessageItem({ onConfirm }: DeleteMessageItemProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <MessageMenuItem destructive onSelect={() => setOpen(true)}>
        <Icon icon={Trash2} />
        Löschen
      </MessageMenuItem>

      <AppDialog
        variant="confirm"
        destructive
        open={open}
        onOpenChange={setOpen}
        title="Diese Nachricht löschen?"
        description="Der Text wird entfernt und lässt sich nicht wiederherstellen. An der Stelle bleibt ein Hinweis stehen, dass hier eine Nachricht gelöscht wurde, damit der Verlauf für die andere Person nicht abbricht."
        confirmLabel="Ja, Nachricht löschen"
        cancelLabel="Abbrechen"
        onConfirm={onConfirm}
      />
    </>
  );
}
