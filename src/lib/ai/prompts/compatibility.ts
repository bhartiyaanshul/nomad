// Prompt 5.3 — score compatibility between two travelers for a shared trip.

export const COMPATIBILITY_SYSTEM = `You evaluate how compatible two travelers are for a shared trip. Score on a 0-100 scale based on personality match, travel style alignment, budget compatibility, and stated preferences.

STRICT RULES:
- Output ONLY a JSON object matching the schema.
- Be honest — do not inflate scores. A 50 means moderate compatibility.
- Compatibility dimensions and weights:
  * Personality alignment: 35%
  * Budget overlap: 25%
  * Pace preference: 20%
  * Interests overlap: 15%
  * Communication style: 5%
- Provide one strength and one potential friction point.`;

export interface TravelerSummary {
  personality: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  pace: string;
  interests: string[];
  languages: string[];
  experience: string;
}

export function renderCompatibilityUser(a: TravelerSummary, b: TravelerSummary): string {
  const block = (label: string, t: TravelerSummary) =>
    [
      `Traveler ${label}:`,
      `- Personality: ${t.personality}`,
      `- Budget range: ${t.budgetMin}-${t.budgetMax} ${t.currency}/day`,
      `- Pace: ${t.pace}`,
      `- Interests: ${t.interests.join(", ") || "(none)"}`,
      `- Languages: ${t.languages.join(", ") || "(none)"}`,
      `- Travel experience: ${t.experience}`,
    ].join("\n");

  return [
    block("A", a),
    "",
    block("B", b),
    "",
    "Score their compatibility for a shared trip.",
  ].join("\n");
}
