import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// .mts, damit die Konfiguration als ES-Modul geladen wird. Das Projekt selbst
// ist CommonJS, und Vitest 4 kann seine Konfiguration nicht per require lesen.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": projectRoot,
      // "server-only" wirft ausserhalb einer Server-Umgebung. Im Test wird es
      // durch ein leeres Modul ersetzt - der Schutz im Build bleibt bestehen.
      "server-only": path.resolve(projectRoot, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    env: {
      // Nur fuer den Testlauf. Die Ratenbegrenzung leitet daraus ihre
      // Bezeichner-Hashes ab und braucht deshalb einen gesetzten Wert.
      AUTH_SECRET: "test-secret-nur-fuer-den-testlauf-0123456789",
      AUTH_URL: "http://localhost:3000",
      MAIL_TRANSPORT: "console",
    },
    // Die Datenbanktests starten eine echte PostgreSQL-Instanz und teilen sich
    // deren Tabellen. Parallel laufende Dateien wuerden sich gegenseitig die
    // Fixtures wegraeumen.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
});
