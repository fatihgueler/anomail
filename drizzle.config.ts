import { defineConfig } from "drizzle-kit";

/**
 * Drizzle-Kit dient hier nur der Pruefung und Introspektion.
 *
 * Die Migrationen unter db/migrations sind von Hand geschrieben, weil
 * drizzle-kit keine down-Dateien erzeugt und Policies, Views und Funktionen
 * ohnehin nicht abbildet. "out" zeigt deshalb bewusst auf ein eigenes
 * Verzeichnis, damit generierte Dateien nie mit den echten Migrationen
 * durcheinandergeraten.
 */
export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/.drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
