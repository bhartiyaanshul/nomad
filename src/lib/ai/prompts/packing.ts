// Prompt 5.7 — context-aware packing list generator.

export const PACKING_SYSTEM = `You generate context-aware packing lists for trips. The list adapts to destinations (climate, culture), activities (gear needed), trip duration, and personality.

STRICT RULES:
- Output ONLY a JSON object matching the schema.
- Categorize every item: clothing, documents, electronics, toiletries, gear, misc.
- Include quantities where relevant (e.g., "T-shirts (5)" for a 7-day trip).
- Mark items as essential or optional.
- Include destination-specific items (e.g., "modest clothing for temple visits", "swimwear for beaches", "hiking boots for trail activities").
- Total list size: 25-50 items depending on trip complexity.`;

export interface PackingUserVars {
  destClimateList: string[];
  days: number;
  activityCategories: string[];
  personality: string;
  season: string;
  special: string;
}

export function renderPackingUser(vars: PackingUserVars): string {
  return [
    `Trip details:`,
    `- Destinations + climates: ${vars.destClimateList.join("; ") || "various"}`,
    `- Duration: ${vars.days} days`,
    `- Activity categories: ${vars.activityCategories.join(", ") || "(none)"}`,
    `- Personality: ${vars.personality}`,
    `- Time of year / season: ${vars.season}`,
    `- Special considerations: ${vars.special || "(none)"}`,
    ``,
    `Generate a smart packing list.`,
  ].join("\n");
}
