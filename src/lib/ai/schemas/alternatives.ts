import { z } from "zod";

export const alternativeSchema = z.object({
  rank: z.number().int().min(1).max(3),
  city: z.string().min(1),
  country: z.string().min(1),
  estimated_cost_match: z.enum(["lower", "similar", "higher"]),
  distance_km_estimate: z.number().nonnegative(),
  personality_match_score: z.number().int().min(0).max(100),
  preserved: z.string(),
  differs: z.string(),
  transport_from_previous: z.object({
    mode: z.string(),
    estimated_hours: z.number().nonnegative(),
  }),
  summary: z.string(),
});

export const alternativesSchema = z.object({
  alternatives: z.array(alternativeSchema).length(3),
});

export type AlternativesOutput = z.infer<typeof alternativesSchema>;

export const alternativesJsonSchema: Record<string, unknown> = {
  type: "object",
  required: ["alternatives"],
  properties: {
    alternatives: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        required: [
          "rank",
          "city",
          "country",
          "estimated_cost_match",
          "distance_km_estimate",
          "personality_match_score",
          "preserved",
          "differs",
          "transport_from_previous",
          "summary",
        ],
        properties: {
          rank: { type: "integer", minimum: 1, maximum: 3 },
          city: { type: "string" },
          country: { type: "string" },
          estimated_cost_match: {
            type: "string",
            enum: ["lower", "similar", "higher"],
          },
          distance_km_estimate: { type: "number", minimum: 0 },
          personality_match_score: {
            type: "integer",
            minimum: 0,
            maximum: 100,
          },
          preserved: { type: "string" },
          differs: { type: "string" },
          transport_from_previous: {
            type: "object",
            required: ["mode", "estimated_hours"],
            properties: {
              mode: { type: "string" },
              estimated_hours: { type: "number", minimum: 0 },
            },
          },
          summary: { type: "string" },
        },
      },
    },
  },
};
