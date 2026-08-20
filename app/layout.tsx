import type { Metadata, Viewport } from "next";
import {
  IBM_Plex_Mono,
  Newsreader,
  Plus_Jakarta_Sans,
} from "next/font/google";

import { auth } from "@/auth";
import { Footer } from "@/components/shell/footer";
import { Header } from "@/components/shell/header";
import { SkipLink } from "@/components/ui/skip-link";
import {
  THEME_INIT_SCRIPT,
  ThemeProvider,
} from "@/components/ui/theme-provider";
import { themeColor } from "@/lib/tokens/theme-color";

import "./globals.css";

/*
 * Drei Familien, und jede hat eine Aufgabe.
 *
 * Das weicht von der Hausregel "hoechstens zwei Familien" ab. Der Grund: die
 * Serif traegt die Briefe, und ein Brief soll aussehen wie ein Brief und nicht
 * wie Oberflaechentext. Die Mono traegt ausschliesslich die Anomail-ID - die
 * einzige Identitaet, die es in diesem Produkt gibt. Deshalb kommt sie mit
 * genau einem Schnitt und nur der lateinischen Teilmenge.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-jakarta",
});

const newsreader = Newsreader({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
  variable: "--font-plex-mono",
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

/**
 * Kein Vorabrendern beim Bauen.
 *
 * Das Layout ruft auth() auf, also ist ohnehin jede Route dynamisch. Es
 * ausdruecklich hinzuschreiben nimmt dem Bau den Versuch, Seiten vorab zu
 * erzeugen - und damit jeden Grund, waehrend des Bauens eine Datenbank
 * anzusprechen, die vom Bau-Schritt aus gar nicht erreichbar ist.
 */
export const dynamic = "force-dynamic";

/**
 * Wurzel-Layout.
 *
 * Der Aufruf von auth() macht jede Route dynamisch - auch die Rechtsseiten,
 * die vorher statisch erzeugt wurden. Das ist der Preis fuer eine Kopfleiste,
 * die weiss, ob jemand angemeldet ist. Die Alternative waere ein Abruf im
 * Browser gewesen, der die Leiste beim Laden sichtbar umspringen liesse.
 * Bei einem Dienst, dessen Seiten ohnehin fast alle personalisiert sind,
 * faellt der Unterschied kaum ins Gewicht.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const angemeldet = session?.user != null && !session.user.isBanned;

  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${jakarta.variable} ${newsreader.variable} ${plexMono.variable}`}
    >
      <head>
        {/* Setzt die Helligkeit vor dem ersten Zeichnen, damit die Seite nie
            kurz in der falschen Farbwelt aufblitzt. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          {/* Erster fokussierbarer Punkt jeder Seite. */}
          <SkipLink />
          <Header angemeldet={angemeldet} />
          {/* flex-1, damit die Fussleiste auch auf kurzen Seiten unten sitzt. */}
          <div className="flex-1">{children}</div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
