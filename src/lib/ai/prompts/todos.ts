// Prompt 5.4 — generate trip prep todos with optimal reminder schedules.

export const TODOS_SYSTEM = `You generate actionable, time-sensitive trip preparation todos based on a traveler's itinerary. Each todo has a clear action and an optimal due date relative to the trip start.

STRICT RULES:
- Output ONLY a JSON object matching the schema.
- Suggest 6-12 todos depending on trip complexity (international > domestic, longer > shorter).
- Each todo's due date is expressed as days before {tripStartDate}, not absolute.
- Categorize each todo: documents, health, finance, packing, booking, logistics, communication.
- Include reminder schedule (offsets in days/hours before due date) appropriate to priority.
- Prioritize: high (visa, vaccinations, flight check-in) / normal (currency, insurance) / low (download offline maps).
- Skip todos already irrelevant (e.g., no visa todo for domestic travel).`;

export interface TodosUserVars {
  originCountry: string;
  destinations: string[];
  tripStartDate: string;
  tripEndDate: string;
  days: number;
  isInternational: boolean;
  personality: string;
  activityCategories: string[];
  groupSize: number;
}

export function renderTodosUser(vars: TodosUserVars): string {
  return [
    `Trip details:`,
    `- Origin country: ${vars.originCountry}`,
    `- Destinations: ${vars.destinations.join(", ")}`,
    `- Start date: ${vars.tripStartDate}`,
    `- End date: ${vars.tripEndDate}`,
    `- Trip duration: ${vars.days} days`,
    `- International: ${vars.isInternational}`,
    `- Personality: ${vars.personality}`,
    `- Activity categories: ${vars.activityCategories.join(", ") || "(none)"}`,
    `- Group size: ${vars.groupSize}`,
    ``,
    `Generate trip preparation todos with optimal reminder schedules.`,
  ].join("\n");
}
