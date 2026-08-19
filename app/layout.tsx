import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { SkipLink } from "@/components/ui/skip-link";
import {
  THEME_INIT_SCRIPT,
  ThemeProvider,
} from "@/components/ui/theme-provider";
import { themeColor } from "@/lib/tokens/theme-color";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: {
    // Jede Route setzt ihren eigenen Titel; diese Vorlage haengt den
    // Dienstnamen an, damit der Tab auch bei vielen offenen Seiten lesbar ist.
    default: "Anomail",
    template: "%s — Anomail",
  },
  description:
    "Schreib anonym über das, was dich belastet. Ein anderer Mensch liest deinen Brief und antwortet dir.",
  applicationName: "Anomail",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

/**
 * Die Farbe der Browserleiste.
 *
 * Sie muss zum tatsaechlichen Seitenhintergrund passen und mit dem Manifest
 * uebereinstimmen. Im Altbestand sagte das Manifest #000000, das Meta-Tag
 * #3A5BDB und der Hintergrund war beige - drei verschiedene Antworten auf
 * dieselbe Frage.
 *
 * Die Werte stammen aus denselben Tokens wie die Oberflaeche, damit sie nicht
 * getrennt voneinander veralten koennen.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: themeColor("light") },
    { media: "(prefers-color-scheme: dark)", color: themeColor("dark") },
  ],
  colorScheme: "light dark",
  // Zoom bis 200% muss moeglich bleiben.
  initialScale: 1,
  width: "device-width",
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning className={jakarta.variable}>
      <head>
        {/* Setzt die Helligkeit vor dem ersten Zeichnen, damit die Seite nie
            kurz in der falschen Farbwelt aufblitzt. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          {/* Erster fokussierbarer Punkt jeder Seite. */}
          <SkipLink />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
