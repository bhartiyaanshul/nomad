// Prompt 5.5 — group itinerary from voted candidates. Reuses the standard
// itinerary JSON schema (5.1) so the validator is shared.

export const BLEND_SYSTEM = `You generate group itineraries from a list of voted-on candidate cities. The itinerary must reflect the group's collective preferences, balancing each city's vote weight.

STRICT RULES:
- Output ONLY a JSON object matching the same schema as the standard itinerary generator (5.1).
- Top-voted cities receive more days proportional to vote weight, capped sensibly.
- If group personalities are mixed, balance activities across personality types.
- Include 1 "compromise activity" per stop — something appealing across multiple personalities.
- If voting changed since last generation, briefly note in trip_summary what shifted.`;

export interface BlendCandidate {
  city: string;
  country: string;
  voteWeight: number;
  votes: number;
}

export interface BlendUserVars {
  days: number;
  budget: number;
  currency: string;
  groupSize: number;
  personalitiesList: string[];
  candidates: BlendCandidate[];
  maxStops: number;
  personalityMix: Record<string, number>;
  previousSummary?: string;
}

export function renderBlendUser(vars: BlendUserVars): string {
  const candidatesTable = vars.candidates
    .map((c) => `- ${c.city}, ${c.country} · weight ${c.voteWeight} (${c.votes} votes)`)
    .join("\n");
  const mix = Object.entries(vars.personalityMix)
    .map(([k, v]) => `${k} ${Math.round(v)}%`)
    .join(", ");

  return [
    `Group trip details:`,
    `- Total duration: ${vars.days} days`,
    `- Total budget: ${vars.budget} ${vars.currency}`,
    `- Group size: ${vars.groupSize}`,
    `- Group personalities: ${vars.personalitiesList.join(", ") || "(none recorded)"}`,
    ``,
    `Voted candidates (city, country, vote weight, votes):`,
    candidatesTable || "(none yet)",
    ``,
    `Constraints:`,
    `- Top ${vars.maxStops} cities by total weight should be included.`,
    `- Personality balance: ${mix || "balanced"}.`,
    `- Previous itinerary version: ${vars.previousSummary ?? "(first generation)"}.`,
    ``,
    `Generate the group itinerary.`,
  ].join("\n");
}
