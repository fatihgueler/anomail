import type {
  ProviderVerdict,
  SafetyProvider,
  SafetyRequest,
} from "../types";

/**
 * Deterministischer Anbieter fuer Tests.
 *
 * Er liefert genau das, was ihm vorgegeben wurde, und kann auf Wunsch
 * scheitern oder haengen bleiben. Nur so laesst sich das Verhalten bei
 * Zeitueberschreitung und Anbieterfehler pruefen, ohne einen echten Dienst zu
 * brauchen.
 */
export class ScriptedSafetyProvider implements SafetyProvider {
  readonly name = "scripted";

  /** Wie oft assess aufgerufen wurde. Fuer Tests auf Doppelaufrufe. */
  calls = 0;

  constructor(
    private readonly behaviour:
      | { kind: "verdict"; verdict: ProviderVerdict }
      | { kind: "throw"; message: string }
      | { kind: "hang" },
  ) {}

  async assess(
    _request: SafetyRequest,
    signal: AbortSignal,
  ): Promise<ProviderVerdict> {
    this.calls += 1;

    if (this.behaviour.kind === "throw") {
      throw new Error(this.behaviour.message);
    }

    if (this.behaviour.kind === "hang") {
      // Wartet, bis das Zeitlimit von aussen abbricht. Ohne diese Auflösung
      // wuerde der Test selbst haengen bleiben.
      return new Promise<ProviderVerdict>((_resolve, reject) => {
        const onAbort = () => {
          reject(new DOMException("Aborted", "AbortError"));
        };

        if (signal.aborted) {
          onAbort();
          return;
        }

        signal.addEventListener("abort", onAbort, { once: true });
      });
    }

    return this.behaviour.verdict;
  }
}
