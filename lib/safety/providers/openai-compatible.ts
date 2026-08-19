import { SAFETY_SYSTEM_PROMPT, buildUserPrompt } from "../prompt";
import {
  isRiskLevel,
  type ProviderVerdict,
  type SafetyProvider,
  type SafetyRequest,
} from "../types";

/**
 * Anbieter fuer jeden Dienst, der das OpenAI-Chat-Format spricht.
 *
 * Bewusst kein festverdrahteter Hersteller und kein SDK. Basis-URL, Modell und
 * Schluessel kommen aus der Umgebung, damit sich ein lokales Ollama, ein
 * kostenloses Kontingent oder ein bezahlter Dienst einsetzen laesst, ohne dass
 * hier eine Zeile Code faellt.
 *
 *   SAFETY_API_BASE_URL   z. B. http://localhost:11434/v1
 *   SAFETY_API_KEY        bei lokalen Diensten oft beliebig
 *   SAFETY_MODEL          Modellbezeichnung des jeweiligen Dienstes
 *
 * Das Zeitlimit wird von aussen als AbortSignal hereingereicht, damit die
 * Obergrenze an einer Stelle steht und nicht in der Bibliothek eines
 * Herstellers verschwindet.
 */
export class OpenAiCompatibleSafetyProvider implements SafetyProvider {
  readonly name = "openai-compatible";

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    const baseUrl = process.env.SAFETY_API_BASE_URL;
    const model = process.env.SAFETY_MODEL;

    if (!baseUrl) {
      throw new Error(
        "SAFETY_API_BASE_URL fehlt. Der Anbieter openai-compatible braucht eine Basis-URL.",
      );
    }

    if (!model) {
      throw new Error(
        "SAFETY_MODEL fehlt. Der Anbieter openai-compatible braucht eine Modellbezeichnung.",
      );
    }

    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.model = model;
    this.apiKey = process.env.SAFETY_API_KEY ?? "";
  }

  async assess(
    request: SafetyRequest,
    signal: AbortSignal,
  ): Promise<ProviderVerdict> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        // Keine Streuung: dieselbe Eingabe soll dieselbe Einstufung ergeben.
        temperature: 0,
        max_tokens: 300,
        messages: [
          { role: "system", content: SAFETY_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildUserPrompt(request.content, request.targetType),
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Sicherheitsdienst antwortete mit ${response.status}: ${body.slice(0, 200)}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const raw = payload.choices?.[0]?.message?.content;

    if (!raw) {
      throw new Error("Sicherheitsdienst lieferte keine verwertbare Antwort.");
    }

    return parseVerdict(raw);
  }
}

/**
 * Liest das JSON aus der Modellantwort.
 *
 * Modelle rahmen ihre Antwort gern in einen Codeblock oder setzen einen Satz
 * davor. Deshalb wird das erste JSON-Objekt herausgeschnitten statt blind
 * geparst. Passt nichts, wirft die Funktion - und der Aufrufer faellt auf das
 * Zurueckhalten zurueck, statt eine erfundene Einstufung zu uebernehmen.
 */
export function parseVerdict(raw: string): ProviderVerdict {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end <= start) {
    throw new Error("Antwort des Sicherheitsdienstes enthielt kein JSON-Objekt.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch (error) {
    throw new Error(
      `Antwort des Sicherheitsdienstes war kein gueltiges JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Antwort des Sicherheitsdienstes war kein Objekt.");
  }

  const candidate = parsed as {
    riskLevel?: unknown;
    detectedCategories?: unknown;
    reasoning?: unknown;
  };

  if (!isRiskLevel(candidate.riskLevel)) {
    throw new Error(
      `Unbekannte Risikostufe "${String(candidate.riskLevel)}" vom Sicherheitsdienst.`,
    );
  }

  const categories = Array.isArray(candidate.detectedCategories)
    ? candidate.detectedCategories
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 10)
    : [];

  const reasoning =
    typeof candidate.reasoning === "string" && candidate.reasoning.trim()
      ? candidate.reasoning.trim().slice(0, 500)
      : "Keine Begruendung geliefert.";

  return {
    riskLevel: candidate.riskLevel,
    detectedCategories: categories,
    reasoning,
  };
}
