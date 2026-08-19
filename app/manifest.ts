import type { MetadataRoute } from "next";

import { themeColor } from "@/lib/tokens/theme-color";

/**
 * Das Web-App-Manifest.
 *
 * theme_color und background_color kommen aus demselben Token wie der
 * tatsaechliche Seitenhintergrund. Im Altbestand sagte das Manifest #000000,
 * das Meta-Tag #3A5BDB und der Hintergrund war beige - hier kann das nicht
 * mehr auseinanderlaufen, weil es nur eine Quelle gibt.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Anomail",
    short_name: "Anomail",
    description:
      "Schreib anonym über das, was dich belastet. Ein anderer Mensch liest deinen Brief und antwortet dir.",
    lang: "de",
    dir: "ltr",
    start_url: "/",
    display: "standalone",
    theme_color: themeColor("light"),
    background_color: themeColor("light"),
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Eigene Datei mit Sicherheitsabstand: ein "any"-Icon als maskable zu
        // deklarieren fuehrt dazu, dass das System die Raender wegschneidet.
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
