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
    // Das 8pt-Raster ist verbindlich: nur diese Schritte sind erlaubt.
    spacing: {
      0: "0px",
      px: "1px",
      1: "4px",
      2: "8px",
      3: "12px",
      4: "16px",
      6: "24px",
      8: "32px",
      12: "48px",
      16: "64px",
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
    fontSize: {
      display: [
        "2rem",
        { lineHeight: "2.375rem", fontWeight: "700", letterSpacing: "-0.02em" },
      ],
      title: [
        "1.5rem",
        { lineHeight: "1.875rem", fontWeight: "700", letterSpacing: "-0.01em" },
      ],
      subtitle: ["1.125rem", { lineHeight: "1.625rem", fontWeight: "600" }],
      body: ["1rem", { lineHeight: "1.625rem", fontWeight: "400" }],
      small: ["0.875rem", { lineHeight: "1.375rem", fontWeight: "400" }],
      label: [
        "0.875rem",
        { lineHeight: "1.125rem", fontWeight: "600", letterSpacing: "0.02em" },
      ],
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
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
        sm: "calc(var(--radius) - 6px)",
        md: "calc(var(--radius) - 3px)",
        lg: "var(--radius)",
        full: "9999px",
      },
      boxShadow: {
        // Der einzige erlaubte Schatten im gesamten System.
        card: "var(--shadow-card)",
        none: "none",
      },
      maxWidth: {
        prose: "68ch",
        shell: "72rem",
      },
      transitionDuration: {
        // Animationen bleiben bei maximal 200ms.
        fast: "120ms",
        DEFAULT: "160ms",
        slow: "200ms",
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
