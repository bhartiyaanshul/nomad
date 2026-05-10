// Hero prompt — full multi-city itinerary in JSON.
// Aggressively trimmed for local Ollama models. Description fields and
// cost_breakdown are derived server-side so the model only outputs the
// minimum needed to define the itinerary.

export const ITINERARY_SYSTEM = `You are an expert travel planner. Output ONLY a JSON object matching the schema. No prose, no markdown, no commentary.

OUTPUT BUDGET (strict — write less, not more):
- trip_summary: ONE short sentence, max 140 chars.
- stop.summary: ONE short phrase, max 80 chars.
- EXACTLY 1 activity per day (not 2, not 3 — exactly 1 marquee activity).

RULES:
- Day numbering is 1-indexed and continuous across stops (stop 1 = days 1-3, stop 2 = days 4-6).
- Use real, well-known place names ("Tsukiji Outer Market", not "Local Fish Market").
- Activity name should be specific and complete on its own (it's the only label the user sees).
- transport_to_next: only the FINAL stop has null. Every other stop has transport.
- total_estimated_cost must be within ±10% of the user's budget.
- Stops in geographic order — no zigzag.

PERSONALITY (skews activity mix):
- foodie: food markets, cooking classes, street food, restaurants.
- adventurer: hiking, water sports, outdoor.
- culture: museums, heritage, history, arts.
- chill: cafes, beaches, parks, slow pace.
- social: nightlife, festivals, group tours.
- budget: free attractions, hostels, walking, street food.
- luxury: fine dining, premium tours, 5-star.
- mixed: balanced spread.

DISCOVERY:
- popular: famous spots tourists recognize.
- explore: offbeat, local-favorite picks.`;

export interface ItineraryUserVars {
  region: string;
  days: number;
  budget: number;
  currency: string;
  personality: string;
  numStops: number;
  discoveryMode: "popular" | "explore";
  startDate: string;
  groupContext?: string | null;
}

export function renderItineraryUser(vars: ItineraryUserVars): string {
  return [
    `Region: ${vars.region}`,
    `Duration: ${vars.days} days`,
    `Budget: ${vars.budget} ${vars.currency}`,
    `Personality: ${vars.personality}`,
    `Cities: ${vars.numStops}`,
    `Discovery: ${vars.discoveryMode}`,
    `Start: ${vars.startDate}`,
    vars.groupContext?.trim() ? vars.groupContext.trim() : "",
    "",
    "Generate the itinerary as JSON.",
  ]
    .filter(Boolean)
    .join("\n");
}
