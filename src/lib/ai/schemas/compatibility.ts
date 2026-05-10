import { z } from "zod";

export const compatibilitySchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  dimensions: z.object({
    personality: z.number().int().min(0).max(100),
    budget: z.number().int().min(0).max(100),
    pace: z.number().int().min(0).max(100),
    interests: z.number().int().min(0).max(100),
    communication: z.number().int().min(0).max(100),
  }),
  strength: z.string(),
  friction_point: z.string(),
  recommendation: z.enum([
    "strong_match",
    "good_match",
    "moderate_match",
    "weak_match",
    "not_recommended",
  ]),
});

export type CompatibilityOutput = z.infer<typeof compatibilitySchema>;

export const compatibilityJsonSchema: Record<string, unknown> = {
  type: "object",
  required: [
    "overall_score",
    "dimensions",
    "strength",
    "friction_point",
    "recommendation",
  ],
  properties: {
    overall_score: { type: "integer", minimum: 0, maximum: 100 },
    dimensions: {
      type: "object",
      required: [
        "personality",
        "budget",
        "pace",
        "interests",
        "communication",
      ],
      properties: {
        personality: { type: "integer", minimum: 0, maximum: 100 },
        budget: { type: "integer", minimum: 0, maximum: 100 },
        pace: { type: "integer", minimum: 0, maximum: 100 },
        interests: { type: "integer", minimum: 0, maximum: 100 },
        communication: { type: "integer", minimum: 0, maximum: 100 },
      },
    },
    strength: { type: "string" },
    friction_point: { type: "string" },
    recommendation: {
      type: "string",
      enum: [
        "strong_match",
        "good_match",
        "moderate_match",
        "weak_match",
        "not_recommended",
      ],
    },
  },
};
