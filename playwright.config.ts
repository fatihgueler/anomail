import { defineConfig, devices } from "@playwright/test";

/**
 * Konfiguration der Barrierefreiheitspruefung.
 *
 * Geprueft wird gegen den Produktionsbau, nicht gegen den Entwicklungsserver.
 * Der Entwicklungsserver blendet eigene Einblendungen ein, die es im Betrieb
 * nicht gibt; eine Pruefung dagegen wuerde teils fremde Fehler melden und
 * teils echte verdecken.
 *
 * Voraussetzung: die lokale Entwicklungsdatenbank laeuft
 * (npx tsx scripts/local-dev-db.mts) und hat .env.local geschrieben.
 */

const BASIS_URL = process.env.A11Y_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  // Die Seiten sind serverseitig gerendert; ein Wiederholungslauf wuerde einen
  // echten Befund nur verschleiern.
  retries: 0,
  fullyParallel: true,
  // Hinter dem Server steht eine einzelne eingebettete PostgreSQL-Instanz.
  // Mit voller Parallelitaet misst der Lauf deren Warteschlange und meldet
  // Zeitueberschreitungen, die nichts mit Barrierefreiheit zu tun haben.
  workers: 2,
  // axe injiziert sein Regelwerk in die Seite und wertet den ganzen Baum aus.
  // Auf den langen Rechtstexten dauert das laenger als die Voreinstellung.
  timeout: 120_000,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: BASIS_URL,
    // Bei einem Fehlschlag ist die Aufnahme das, woran sich der Befund
    // nachvollziehen laesst.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "hell",
      use: { ...devices["Desktop Chrome"], colorScheme: "light" },
    },
    {
      name: "dunkel",
      use: { ...devices["Desktop Chrome"], colorScheme: "dark" },
    },
  ],
  webServer: process.env.A11Y_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run start",
        url: BASIS_URL,
        reuseExistingServer: !process.env.CI,
        // Bauen und Starten auf einem kalten CI-Laeufer, inklusive der
        // Schriften, die next/font beim Bauen herunterlaedt. 300 Sekunden
        // waren dafuer knapp bemessen.
        timeout: 600_000,
      },
});
