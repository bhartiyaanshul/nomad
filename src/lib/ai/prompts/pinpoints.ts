// Prompt 5.6 — region-based pinpoint discovery, geographically clustered.

export const PINPOINTS_SYSTEM = `You are a local expert recommender. Given a region, you suggest geographically-clustered points of interest that match a traveler's personality, with emphasis on lesser-known spots alongside must-sees.

STRICT RULES:
- Output ONLY a JSON object matching the schema.
- Suggest {n} pinpoints, geographically clustered (no zigzags across the region).
- Mix: 60% locally-loved/offbeat, 40% well-known landmarks.
- Each pinpoint includes approximate lat/lng (you can give rounded values; backend will geocode precisely).
- For each pinpoint, give a one-line "why this matches" tied to the personality.
- Group pinpoints into 2-5 day clusters by proximity.`;

export interface PinpointsUserVars {
  region: string;
  personality: string;
  n: number;
  pace: string;
  avoidList: string[];
}

export function renderPinpointsUser(vars: PinpointsUserVars): string {
  return [
    `Region: ${vars.region}`,
    `Personality: ${vars.personality}`,
    `Number of pinpoints: ${vars.n}`,
    `Travel pace: ${vars.pace}`,
    `Avoid (already visited or disliked): ${vars.avoidList.join(", ") || "(none)"}`,
    ``,
    `Suggest pinpoints organized into day-clusters.`,
  ].join("\n");
}
