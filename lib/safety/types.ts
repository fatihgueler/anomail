/**
 * Einstufung und Schwellenwerte der Inhaltspruefung.
 *
 * Die Pruefung diagnostiziert niemanden und gibt keine Ratschlaege. Sie
 * liefert ausschliesslich eine Einstufung und eine Begruendung fuer die
 * Moderation.
 */

export const RISK_LEVELS = ["GREEN", "YELLOW", "RED", "CRISIS"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export type SafetyTargetType = "letter" | "message" | "conversation";

export type SafetyVerdict = {
  riskLevel: RiskLevel;
  /** Zurueckhalten und der Moderation vorlegen, statt in den Pool geben. */
  shouldHold: boolean;
  /** Dem Schreibenden den Krisen-Dialog zeigen. */
  showCrisisNotice: boolean;
  detectedCategories: string[];
  reasoning: string;
};

export type SafetyRequest = {
  content: string;
  targetType: SafetyTargetType;
};

/** Rohantwort eines Anbieters, bevor die Schwellenwerte angewandt werden. */
export type ProviderVerdict = {
  riskLevel: RiskLevel;
  detectedCategories: string[];
  reasoning: string;
};

export interface SafetyProvider {
  readonly name: string;
  assess(request: SafetyRequest, signal: AbortSignal): Promise<ProviderVerdict>;
}

/* ------------------------------------------------------------------ */
/* Schwellenwerte                                                      */
/* ------------------------------------------------------------------ */

/*
 * Diese Konstanten sind der Ort zum Nachjustieren. Sie stehen hier und nicht
 * verstreut in Bedingungen, damit eine Aenderung an genau einer Stelle wirkt.
 *
 * Hintergrund: im Altsystem stand ein Brief mit "Ich hasse mein Leben" als
 * waiting ohne jede Krisen-Kennzeichnung in den Live-Daten, waehrend ein
 * harmloser Beleidigungsfall als GELB gefuehrt wurde. Die Erkennung war fuer
 * den Krisenfall zu locker und fuer Umgangston zu streng. Die Werte unten
 * kehren dieses Verhaeltnis um.
 */

/** Ab dieser Stufe wird der Brief zurueckgehalten und der Moderation vorgelegt. */
export const HOLD_FROM: readonly RiskLevel[] = ["RED", "CRISIS"];

/** Ab dieser Stufe sieht der Schreibende den Krisen-Dialog. */
export const CRISIS_NOTICE_FROM: readonly RiskLevel[] = ["RED", "CRISIS"];

/**
 * YELLOW ist bewusst folgenlos.
 *
 * Ein rauer Ton, Wut oder eine harte Formulierung sind kein Grund, einen Brief
 * aus dem Verkehr zu ziehen. Menschen schreiben hier ueber Belastendes; dabei
 * faellt nicht immer ein hoeflicher Satz. YELLOW wird protokolliert und bleibt
 * fuer die Moderation sichtbar, haelt aber nichts auf.
 */
export const YELLOW_HOLDS = false;

/**
 * Hartes Zeitlimit fuer den Anbieteraufruf.
 *
 * Kurz genug, dass ein haengender Dienst das Absenden nicht blockiert, lang
 * genug fuer eine normale Antwort. Nach Ablauf greift FALLBACK_VERDICT.
 */
export const SAFETY_TIMEOUT_MS = 8_000;

/**
 * Ergebnis bei Zeitueberschreitung oder Anbieterfehler.
 *
 * Im Zweifel zurueckhalten. Ein faelschlich zurueckgehaltener Brief kostet die
 * Moderation ein paar Minuten; ein faelschlich durchgelassener Brief landet bei
 * einer ungeschulten Privatperson. Diese beiden Fehler wiegen nicht gleich
 * schwer, deshalb ist der Ausfall kein stilles Durchlassen.
 */
export function fallbackVerdict(reason: string): SafetyVerdict {
  return {
    riskLevel: "RED",
    shouldHold: true,
    // Kein Krisen-Dialog: die Pruefung hat nichts erkannt, sie ist ausgefallen.
    // Einen Krisen-Hinweis ohne Anlass zu zeigen, wuerde den Hinweis abnutzen.
    showCrisisNotice: false,
    detectedCategories: ["pruefung_nicht_verfuegbar"],
    reasoning: `Automatische Pruefung nicht verfuegbar (${reason}). Brief zurueckgehalten und zur Sichtung vorgelegt.`,
  };
}

/** Wendet die Schwellenwerte auf die Rohantwort eines Anbieters an. */
export function applyThresholds(verdict: ProviderVerdict): SafetyVerdict {
  const shouldHold =
    HOLD_FROM.includes(verdict.riskLevel) ||
    (YELLOW_HOLDS && verdict.riskLevel === "YELLOW");

  return {
    riskLevel: verdict.riskLevel,
    shouldHold,
    showCrisisNotice: CRISIS_NOTICE_FROM.includes(verdict.riskLevel),
    detectedCategories: verdict.detectedCategories,
    reasoning: verdict.reasoning,
  };
}

export function isRiskLevel(value: unknown): value is RiskLevel {
  return (
    typeof value === "string" && (RISK_LEVELS as readonly string[]).includes(value)
  );
}
