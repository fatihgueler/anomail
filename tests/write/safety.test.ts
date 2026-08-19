import { describe, expect, test } from "vitest";

import {
  CRISIS_NOTICE_FROM,
  HOLD_FROM,
  RuleBasedSafetyProvider,
  ScriptedSafetyProvider,
  YELLOW_HOLDS,
  applyThresholds,
  checkContentSafety,
  fallbackVerdict,
} from "@/lib/safety";
import { parseVerdict } from "@/lib/safety/providers/openai-compatible";

/**
 * Die Einstufung ohne Datenbank.
 *
 * Der Schwerpunkt liegt auf dem Verhaeltnis, das im Altsystem verkehrt war:
 * Krisensignale wurden zu locker, Umgangston zu streng eingestuft.
 */

const rules = new RuleBasedSafetyProvider();

async function assess(content: string) {
  return checkContentSafety(
    { content, targetType: "letter" },
    { provider: rules },
  );
}

describe("Schwellenwerte", () => {
  test("zurueckgehalten wird ab RED, der Krisen-Dialog erscheint ab RED", () => {
    expect([...HOLD_FROM]).toEqual(["RED", "CRISIS"]);
    expect([...CRISIS_NOTICE_FROM]).toEqual(["RED", "CRISIS"]);
    expect(YELLOW_HOLDS).toBe(false);
  });

  test("GREEN und YELLOW halten nichts auf", () => {
    for (const level of ["GREEN", "YELLOW"] as const) {
      const verdict = applyThresholds({
        riskLevel: level,
        detectedCategories: [],
        reasoning: "test",
      });

      expect(verdict.shouldHold).toBe(false);
      expect(verdict.showCrisisNotice).toBe(false);
    }
  });

  test("RED und CRISIS halten zurueck und zeigen den Hinweis", () => {
    for (const level of ["RED", "CRISIS"] as const) {
      const verdict = applyThresholds({
        riskLevel: level,
        detectedCategories: [],
        reasoning: "test",
      });

      expect(verdict.shouldHold).toBe(true);
      expect(verdict.showCrisisNotice).toBe(true);
    }
  });
});

describe("Der Rueckfall aus dem Altsystem", () => {
  test('"Ich hasse mein Leben" faellt nicht mehr auf unauffaellig', async () => {
    const verdict = await assess(
      "Ich hasse mein Leben und weiss nicht mehr weiter. Jeder Tag fuehlt sich gleich an.",
    );

    expect(["RED", "CRISIS"]).toContain(verdict.riskLevel);
    expect(verdict.shouldHold).toBe(true);
    expect(verdict.showCrisisNotice).toBe(true);
  });

  test("eine Ankuendigung faellt auf CRISIS", async () => {
    const verdict = await assess(
      "Ich will nicht mehr leben und habe mich schon von allen verabschiedet.",
    );

    expect(verdict.riskLevel).toBe("CRISIS");
    expect(verdict.shouldHold).toBe(true);
  });

  test("eine Beleidigung bleibt YELLOW und haelt nichts auf", async () => {
    const verdict = await assess(
      "Mein Chef ist ein Idiot und ich habe die Nase voll von diesem Laden.",
    );

    expect(verdict.riskLevel).toBe("YELLOW");
    expect(verdict.shouldHold).toBe(false);
    expect(verdict.showCrisisNotice).toBe(false);
  });

  test("Belastung ohne Gefaehrdungssignal bleibt GREEN", async () => {
    const verdict = await assess(
      "Seit dem Umzug ist alles fremd. Ich vermisse meine alte Umgebung und finde schwer Anschluss.",
    );

    expect(verdict.riskLevel).toBe("GREEN");
    expect(verdict.shouldHold).toBe(false);
  });

  test("eine Rufnummer im Text wird als persoenliche Daten erkannt", async () => {
    const verdict = await assess(
      "Melde dich gern, meine Nummer ist 0170 1234567, dann koennen wir reden.",
    );

    expect(verdict.riskLevel).toBe("YELLOW");
    expect(verdict.detectedCategories).toContain("persoenliche_daten");
  });
});

describe("Ausfall des Anbieters", () => {
  test("der Rueckfall haelt zurueck und zeigt keinen Krisen-Dialog", () => {
    const verdict = fallbackVerdict("Test");

    expect(verdict.riskLevel).toBe("RED");
    expect(verdict.shouldHold).toBe(true);
    // Ein Krisen-Hinweis ohne Anlass wuerde den Hinweis abnutzen.
    expect(verdict.showCrisisNotice).toBe(false);
  });

  test("checkContentSafety wirft nie, auch wenn der Anbieter wirft", async () => {
    const verdict = await checkContentSafety(
      { content: "egal", targetType: "letter" },
      {
        provider: new ScriptedSafetyProvider({
          kind: "throw",
          message: "kaputt",
        }),
      },
    );

    expect(verdict.shouldHold).toBe(true);
  });

  test("das Zeitlimit greift und haelt zurueck", async () => {
    const started = Date.now();

    const verdict = await checkContentSafety(
      { content: "egal", targetType: "letter" },
      { provider: new ScriptedSafetyProvider({ kind: "hang" }), timeoutMs: 60 },
    );

    expect(Date.now() - started).toBeLessThan(2_000);
    expect(verdict.shouldHold).toBe(true);
    expect(verdict.detectedCategories).toContain("pruefung_nicht_verfuegbar");
  });
});

describe("Antwort eines Sprachmodells lesen", () => {
  test("JSON im Codeblock wird gefunden", () => {
    const verdict = parseVerdict(
      'Hier das Ergebnis:\n```json\n{"riskLevel":"RED","detectedCategories":["Selbstgefaehrdung"],"reasoning":"Signal."}\n```',
    );

    expect(verdict.riskLevel).toBe("RED");
    expect(verdict.detectedCategories).toEqual(["selbstgefaehrdung"]);
  });

  test("eine unbekannte Stufe wird abgelehnt, statt uebernommen zu werden", () => {
    expect(() =>
      parseVerdict('{"riskLevel":"VIELLEICHT","detectedCategories":[]}'),
    ).toThrow();
  });

  test("Text ohne JSON wird abgelehnt", () => {
    expect(() => parseVerdict("Ich kann das nicht einschaetzen.")).toThrow();
  });
});
