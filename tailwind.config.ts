import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Anomail Design System.
 *
 * Alle Farben kommen ausschliesslich aus CSS-Variablen (siehe app/globals.css).
 * Im Komponentencode darf es keine harten Farbwerte geben.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    /*
     * Das 8pt-Raster ist verbindlich: nur diese Schritte sind erlaubt.
     *
     * Die Stufen ab 10 sind fuer den Abschnittsrhythmus dazugekommen. Sie
     * halten das Raster (40, 56, 80, 96, 112, 128 sind alle durch 8 teilbar).
     * Ohne sie verwarf Tailwind Klassen wie py-24 stillschweigend, und ein
     * Abschnitt hatte am Ende gar keinen Abstand - zu sehen war das nur, wenn
     * man es gesucht hat.
     *
     * tests/ui/raster.test.ts faellt durch, sobald im Code eine Stufe
     * auftaucht, die hier nicht steht.
     */
    spacing: {
      0: "0px",
      px: "1px",
      1: "4px",
      2: "8px",
      3: "12px",
      4: "16px",
      6: "24px",
      8: "32px",
      10: "40px",
      12: "48px",
      14: "56px",
      16: "64px",
      20: "80px",
      24: "96px",
      28: "112px",
      32: "128px",
      48: "192px",
      64: "256px",
      touch: "44px",
      control: "52px",
      full: "100%",
    },
    borderWidth: {
      0: "0px",
      DEFAULT: "1px",
      2: "2px",
      control: "1.5px",
      accentbar: "3px",
    },
    /*
     * Fluide Skala ueber clamp(). Sechs Stufen.
     *
     * Untergrenze bleibt 14px: kleiner wird nichts, das ist seit AP1 fest.
     * Die Serif-Stufen tragen weniger Fettung als vorher - eine Newsreader in
     * 400 wirkt bei 4rem staerker als eine Jakarta in 700 bei 2rem.
     */
    fontSize: {
      display: [
        "clamp(2.25rem, 1.55rem + 3.1vw, 4rem)",
        { lineHeight: "1.08", fontWeight: "400", letterSpacing: "-0.02em" },
      ],
      title: [
        "clamp(1.75rem, 1.45rem + 1.3vw, 2.5rem)",
        { lineHeight: "1.15", fontWeight: "400", letterSpacing: "-0.015em" },
      ],
      subtitle: [
        "clamp(1.25rem, 1.15rem + 0.45vw, 1.5rem)",
        { lineHeight: "1.3", fontWeight: "500", letterSpacing: "-0.01em" },
      ],
      lead: [
        "clamp(1.125rem, 1.05rem + 0.35vw, 1.3125rem)",
        { lineHeight: "1.6", fontWeight: "400" },
      ],
      body: [
        "clamp(1rem, 0.975rem + 0.12vw, 1.0625rem)",
        { lineHeight: "1.65", fontWeight: "400" },
      ],
      small: ["0.875rem", { lineHeight: "1.375rem", fontWeight: "400" }],
      label: [
        "0.875rem",
        { lineHeight: "1.125rem", fontWeight: "600", letterSpacing: "0.02em" },
      ],
      /* Die Anomail-ID. Mono, gesperrt, tabellarisch. */
      kennung: [
        "0.9375rem",
        { lineHeight: "1.25rem", fontWeight: "400", letterSpacing: "0.08em" },
      ],
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        /* Ueberschriften und alles, was ein Mensch geschrieben hat. */
        serif: ["var(--font-newsreader)", "Georgia", "serif"],
        /* Ausschliesslich die Anomail-ID. */
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          hover: "hsl(var(--primary-hover) / <alpha-value>)",
          active: "hsl(var(--primary-active) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          hover: "hsl(var(--accent-hover) / <alpha-value>)",
          active: "hsl(var(--accent-active) / <alpha-value>)",
          /* Zierflaeche. Niemals Schriftfarbe - siehe contrast.test.ts. */
          soft: "hsl(var(--accent-soft) / <alpha-value>)",
        },
        desk: {
          DEFAULT: "hsl(var(--desk) / <alpha-value>)",
          foreground: "hsl(var(--desk-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          hover: "hsl(var(--destructive-hover) / <alpha-value>)",
          active: "hsl(var(--destructive-active) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "calc(var(--radius) - 3px)",
        lg: "var(--radius)",
        xl: "var(--radius-lg)",
        full: "9999px",
      },
      boxShadow: {
        /*
         * Vier Stufen statt einer, alle warm getoent. Die Namen sind bewusst
         * nicht sm/md/lg/xl: tests/a11y/contrast.test.ts verbietet Tailwinds
         * Standardschatten, um die Token-Nutzung zu erzwingen, und diese
         * Regel soll bestehen bleiben.
         */
        "paper-1": "var(--shadow-paper-1)",
        "paper-2": "var(--shadow-paper-2)",
        "paper-3": "var(--shadow-paper-3)",
        "paper-4": "var(--shadow-paper-4)",
        /* Bestandsname, damit vorhandene Komponenten weiterlaufen. */
        card: "var(--shadow-card)",
        none: "none",
      },
      maxWidth: {
        /* Fliesstext. Laenger als 68 Zeichen wird muehsam zu lesen. */
        prose: "68ch",
        /* Brieftext, noch etwas enger. */
        brief: "62ch",
        shell: "72rem",
        narrow: "34rem",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        DEFAULT: "var(--duration-base)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
        signature: "var(--duration-signature)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
      },
      keyframes: {
        "overlay-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "dialog-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        // Nur Zustandswechsel, nie Dauerschleifen. Der Skeleton bleibt bewusst statisch.
        "overlay-in": "overlay-in 160ms ease-out",
        "dialog-in": "dialog-in 160ms ease-out",
        "sheet-in": "sheet-in 200ms ease-out",
      },
    },
  },
  plugins: [animate],
};

export default config;
