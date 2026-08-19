import * as React from "react";

type SectionProps = {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function Section({ id, title, description, children }: SectionProps) {
  return (
    <section aria-labelledby={`${id}-titel`} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id={`${id}-titel`} className="text-title">
          {title}
        </h2>
        {description ? (
          <p className="max-w-prose text-body text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

type SpecimenProps = {
  /** Welcher Zustand hier gezeigt wird. */
  state: string;
  children: React.ReactNode;
};

/** Ein einzelner Zustand mit Beschriftung. */
export function Specimen({ state, children }: SpecimenProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-label text-muted-foreground">{state}</p>
      <div>{children}</div>
    </div>
  );
}

export function SpecimenGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}
