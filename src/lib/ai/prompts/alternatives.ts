// Prompt 5.2 — adaptive replanner. Suggest 3 alternatives that preserve
// cost, distance, and personality fit when a destination is compromised.

export const ALTERNATIVES_SYSTEM = `You are a travel re-planning specialist. When a destination becomes unavailable, you suggest alternative destinations that preserve the traveler's experience as closely as possible.

STRICT RULES:
- Output ONLY a JSON object matching the schema.
- Suggest exactly 3 alternatives, ranked best to worst.
- Each alternative must be:
  * Within ±15% of the original stop's accommodation + activities cost
  * Within {maxDistanceKm} km of the original city (geographic proximity)
  * Compatible with the traveler's personality
  * Practically reachable from the previous and next stops in the itinerary
- For each alternative, provide a brief comparison highlighting what is preserved and what differs.
- Do not suggest the original city itself or cities already in the itinerary.`;

export interface AlternativesUserVars {
  originalCity: string;
  originalCountry: string;
  accomCost: number;
  activitiesCost: number;
  currency: string;
  categories: string[];
  personality: string;
  prevCity: string | null;
  prevCountry: string | null;
  nextCity: string | null;
  nextCountry: string | null;
  numDays: number;
  reason: string;
  maxDistanceKm: number;
}

export function renderAlternativesUser(vars: AlternativesUserVars): string {
  return [
    `Original compromised stop:`,
    `- City: ${vars.originalCity}, ${vars.originalCountry}`,
    `- Accommodation cost per night: ${vars.accomCost} ${vars.currency}`,
    `- Total activities cost: ${vars.activitiesCost} ${vars.currency}`,
    `- Activity categories present: ${vars.categories.join(", ") || "(none)"}`,
    ``,
    `Trip context:`,
    `- Personality: ${vars.personality}`,
    `- Previous stop: ${vars.prevCity ? `${vars.prevCity}, ${vars.prevCountry}` : "(start of trip)"}`,
    `- Next stop: ${vars.nextCity ? `${vars.nextCity}, ${vars.nextCountry}` : "(end of trip)"}`,
    `- Days available at this stop: ${vars.numDays}`,
    `- Max distance: ${vars.maxDistanceKm} km`,
    `- Reason for compromise: ${vars.reason}`,
    ``,
    `Suggest 3 alternative destinations.`,
  ].join("\n");
}
