import type {
  ProviderVerdict,
  SafetyProvider,
  SafetyRequest,
} from "../types";

/**
 * Regelbasierte Einstufung ohne externen Dienst.
 *
 * Sie ersetzt kein Sprachmodell. Sie ist die Voreinstellung, damit der Dienst
 * ohne Anbieter und ohne Kosten lauffaehig ist, und sie faengt genau die
 * Signale ab, an denen das Altsystem gescheitert ist.
 *
 * Bewusste Auslegung: eher zu viel als zu wenig bei Selbstgefaehrdung, eher zu
 * wenig als zu viel bei Umgangston. Ein falsch zurueckgehaltener Brief kostet
 * Moderationszeit; ein falsch durchgelassener Krisenbrief landet bei einer
 * ungeschulten Privatperson.
 */

type Rule = {
  category: string;
  patterns: RegExp[];
};

/** Ankuendigung, Absicht oder Planung. Faellt auf CRISIS. */
const CRISIS_RULES: Rule[] = [
  {
    category: "suizidabsicht",
    patterns: [
      /\bbring(e|en)?\s+mich\s+um\b/i,
      /\bumbringen\b/i,
      /\bmach(e)?\s+schluss\b/i,
      /\bschluss\s+machen\s+mit\s+(dem\s+)?leben\b/i,
      /\bnicht\s+mehr\s+leben\b/i,
      /\bwill\s+(nicht\s+mehr\s+)?sterben\b/i,
      /\bsuizid\b/i,
      /\bselbstmord\b/i,
      /\bmein\s+letzter\s+brief\b/i,
      /\bwenn\s+ich\s+nicht\s+mehr\s+da\s+bin\b/i,
      /\bohne\s+mich\s+(waer|wär|ist|ists|wäre)\b/i,
      /\bverabschiede\s+mich\b/i,
    ],
  },
  {
    category: "gewaltankuendigung",
    patterns: [
      /\bich\s+(werde|will|wollte)\s+(ihn|sie|ihm|ihr|euch|dich)\s+(um)?bringen\b/i,
      /\bich\s+bringe\s+(ihn|sie|euch|dich)\s+um\b/i,
    ],
  },
];

/** Anhaltende Belastung mit Gefaehrdungssignal, ohne erkennbare Absicht. */
const RED_RULES: Rule[] = [
  {
    category: "selbstgefaehrdung",
    patterns: [
      /\bhasse\s+mein\s+leben\b/i,
      /\bkann\s+nicht\s+mehr\b/i,
      /\bhalte\s+das\s+nicht\s+mehr\s+aus\b/i,
      /\bmag\s+nicht\s+mehr\b/i,
      /\balles\s+sinnlos\b/i,
      /\bkeinen\s+sinn\s+mehr\b/i,
      /\bwill\s+(einfach\s+)?verschwinden\b/i,
      /\bwill\s+nur\s+noch\s+weg\b/i,
      /\britz(e|en)\b/i,
      /\bselbstverletz/i,
      /\btu\s+mir\s+weh\b/i,
      /\blebensmued/i,
      /\bhoffnungslos\b/i,
    ],
  },
  {
    category: "gewalt",
    patterns: [
      /\bschlaegt\s+mich\b/i,
      /\bschlägt\s+mich\b/i,
      /\bmissbrauch/i,
      /\bvergewaltig/i,
      /\bwird\s+mir\s+gewalt\s+angetan\b/i,
    ],
  },
];

/** Umgangston und Unpassendes. Wird protokolliert, haelt aber nichts auf. */
const YELLOW_RULES: Rule[] = [
  {
    category: "beleidigung",
    patterns: [
      /\bidiot\b/i,
      /\barschloch\b/i,
      /\bdepp\b/i,
      /\bhaltd?\s*die\s+fresse\b/i,
      /\bverpiss\s+dich\b/i,
    ],
  },
  {
    category: "persoenliche_daten",
    patterns: [
      // Rufnummern und E-Mail-Adressen im Brieftext.
      /\b(?:\+49|0)\s*\d{2,5}[\s/-]?\d{3,}\b/,
      /\b[^\s@]+@[^\s@]+\.[a-z]{2,}\b/i,
    ],
  },
  {
    category: "spam",
    patterns: [/\bhttps?:\/\//i, /\bjetzt\s+kaufen\b/i, /\bgratis\s+gewinn/i],
  },
];

function collect(content: string, rules: Rule[]): string[] {
  const hits = new Set<string>();

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(content))) {
      hits.add(rule.category);
    }
  }

  return [...hits];
}

export class RuleBasedSafetyProvider implements SafetyProvider {
  readonly name = "rules";

  async assess(request: SafetyRequest): Promise<ProviderVerdict> {
    const crisis = collect(request.content, CRISIS_RULES);

    if (crisis.length > 0) {
      return {
        riskLevel: "CRISIS",
        detectedCategories: crisis,
        reasoning: `Regelpruefung: Signal fuer ${crisis.join(", ")} im Text gefunden.`,
      };
    }

    const red = collect(request.content, RED_RULES);

    if (red.length > 0) {
      return {
        riskLevel: "RED",
        detectedCategories: red,
        reasoning: `Regelpruefung: Signal fuer ${red.join(", ")} im Text gefunden.`,
      };
    }

    const yellow = collect(request.content, YELLOW_RULES);

    if (yellow.length > 0) {
      return {
        riskLevel: "YELLOW",
        detectedCategories: yellow,
        reasoning: `Regelpruefung: ${yellow.join(", ")} erkannt, keine Gefaehrdung.`,
      };
    }

    return {
      riskLevel: "GREEN",
      detectedCategories: [],
      reasoning: "Regelpruefung: kein Signal gefunden.",
    };
  }
}
