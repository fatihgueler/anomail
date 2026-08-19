/**
 * Ersatz fuer "server-only" im Testlauf.
 *
 * Das echte Paket wirft, sobald es ausserhalb einer Server-Umgebung geladen
 * wird. Das ist im Build genau richtig und im Test hinderlich, weil die Tests
 * dieselben Module direkt in Node ausfuehren. Der Schutz fuer das Client-Bundle
 * bleibt davon unberuehrt: dort greift weiterhin das echte Paket.
 */
export {};
