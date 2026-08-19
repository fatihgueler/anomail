import { OpenAiCompatibleSafetyProvider } from "./providers/openai-compatible";
import { RuleBasedSafetyProvider } from "./providers/rules";
import {
  SAFETY_TIMEOUT_MS,
  applyThresholds,
  fallbackVerdict,
  type SafetyProvider,
  type SafetyRequest,
  type SafetyVerdict,
} from "./types";

export * from "./types";
export { RuleBasedSafetyProvider } from "./providers/rules";
export { ScriptedSafetyProvider } from "./providers/scripted";
export { SAFETY_SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

/**
 * Inhaltspruefung.
 *
 * Laeuft ausschliesslich auf dem Server. Der Client bekommt das Ergebnis
 * hoechstens als Anzeigezustand zu sehen, faellt aber keine Entscheidung
 * daraus ab.
 */

let provider: SafetyProvider | undefined;

/**
 * Waehlt den Anbieter anhand von SAFETY_PROVIDER.
 *
 * Voreinstellung ist die regelbasierte Pruefung: sie laeuft ohne externen
 * Dienst, ohne Schluessel und ohne Kosten. Wer ein Sprachmodell einsetzen
 * will, setzt SAFETY_PROVIDER=openai-compatible und die drei zugehoerigen
 * Variablen - das funktioniert mit einem lokalen Ollama ebenso wie mit einem
 * gehosteten Dienst.
 *
 * Ein unbekannter Wert wirft. Ein stiller Rueckfall waere hier besonders
 * gefaehrlich: die Pruefung saehe aktiv aus und waere es nicht.
 */
export function getSafetyProvider(): SafetyProvider {
  if (provider) {
    return provider;
  }

  const configured = process.env.SAFETY_PROVIDER ?? "rules";

  if (configured === "rules") {
    provider = new RuleBasedSafetyProvider();
    return provider;
  }

  if (configured === "openai-compatible") {
    provider = new OpenAiCompatibleSafetyProvider();
    return provider;
  }

  throw new Error(
    `Unbekannter SAFETY_PROVIDER "${configured}". Bekannt sind "rules" und "openai-compatible".`,
  );
}

/** Nur fuer Tests: setzt den Anbieter. */
export function setSafetyProvider(replacement?: SafetyProvider): void {
  provider = replacement;
}

/**
 * Prueft einen Inhalt und liefert immer ein Ergebnis.
 *
 * Es gibt keinen Pfad, auf dem diese Funktion wirft. Ein Anbieterfehler, ein
 * Zeitueberschreiten oder eine unlesbare Antwort fuehren zum Zurueckhalten,
 * nicht zu einem Abbruch und schon gar nicht zu einem stillen Durchlassen.
 */
export async function checkContentSafety(
  request: SafetyRequest,
  options: { timeoutMs?: number; provider?: SafetyProvider } = {},
): Promise<SafetyVerdict> {
  const timeoutMs = options.timeoutMs ?? SAFETY_TIMEOUT_MS;

  let active: SafetyProvider;

  try {
    active = options.provider ?? getSafetyProvider();
  } catch (error) {
    console.error("[safety] Anbieter nicht verfuegbar", error);
    return fallbackVerdict("Anbieter nicht konfiguriert");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const verdict = await active.assess(request, controller.signal);
    return applyThresholds(verdict);
  } catch (error) {
    const aborted = controller.signal.aborted;

    console.error(
      "[safety] Pruefung fehlgeschlagen",
      JSON.stringify({
        provider: active.name,
        aborted,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );

    return fallbackVerdict(
      aborted ? `Zeitlimit von ${timeoutMs} ms ueberschritten` : "Anbieterfehler",
    );
  } finally {
    clearTimeout(timer);
  }
}
