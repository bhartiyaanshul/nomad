import { z } from "zod";

// Zod equivalent of the Ollama JSON schema. We validate the model output
// against this before persisting.
export const itineraryActivitySchema = z.object({
  name: z.string().min(1),
  day: z.number().int().min(1),
  category: z.enum([
    "food",
    "sightseeing",
    "adventure",
    "culture",
    "relaxation",
    "shopping",
    "nightlife",
  ]),
  estimated_duration_hours: z.number().nonnegative().optional(),
  estimated_cost: z.number().nonnegative(),
  description: z.string(),
  personality_fit: z.string().optional(),
});

export const itineraryAccommodationSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    "hostel",
    "budget_hotel",
    "mid_range_hotel",
    "boutique",
    "luxury",
    "homestay",
    "airbnb",
  ]),
  cost_per_night: z.number().nonnegative(),
});

export const itineraryTransportSchema = z
  .object({
    mode: z.enum(["flight", "train", "bus", "car", "ferry"]),
    cost: z.number().nonnegative(),
    duration_hours: z.number().nonnegative(),
  })
  .nullable();

export const itineraryStopSchema = z.object({
  city: z.string().min(1),
  country: z.string().min(1),
  summary: z.string(),
  arrival_day: z.number().int().min(1),
  departure_day: z.number().int().min(1),
  accommodation: itineraryAccommodationSchema,
  transport_to_next: itineraryTransportSchema.optional(),
  daily_food_estimate: z.number().nonnegative(),
  activities: z.array(itineraryActivitySchema),
});

export const itinerarySchema = z.object({
  trip_summary: z.string(),
  personality: z.string(),
  currency: z.string(),
  total_days: z.number().int().min(1),
  total_estimated_cost: z.number().nonnegative(),
  cost_breakdown: z.object({
    accommodation: z.number().nonnegative(),
    food: z.number().nonnegative(),
    activities: z.number().nonnegative(),
    transport: z.number().nonnegative(),
    miscellaneous: z.number().nonnegative(),
  }),
  stops: z.array(itineraryStopSchema).min(1),
});

export type ItineraryOutput = z.infer<typeof itinerarySchema>;
export type ItineraryStop = z.infer<typeof itineraryStopSchema>;
export type ItineraryActivity = z.infer<typeof itineraryActivitySchema>;

// JSON Schema (draft-07 subset) passed to Ollama's `format` field.
// Mirrors the Zod schema exactly. Keep them in sync.
export const itineraryJsonSchema: Record<string, unknown> = {
  type: "object",
  required: [
    "trip_summary",
    "personality",
    "currency",
    "total_days",
    "total_estimated_cost",
    "cost_breakdown",
    "stops",
  ],
  properties: {
    trip_summary: { type: "string" },
    personality: { type: "string" },
    currency: { type: "string" },
    total_days: { type: "integer", minimum: 1 },
    total_estimated_cost: { type: "number", minimum: 0 },
    cost_breakdown: {
      type: "object",
      required: [
        "accommodation",
        "food",
        "activities",
        "transport",
        "miscellaneous",
      ],
      properties: {
        accommodation: { type: "number", minimum: 0 },
        food: { type: "number", minimum: 0 },
        activities: { type: "number", minimum: 0 },
        transport: { type: "number", minimum: 0 },
        miscellaneous: { type: "number", minimum: 0 },
      },
    },
    stops: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: [
          "city",
          "country",
          "arrival_day",
          "departure_day",
          "summary",
          "accommodation",
          "activities",
          "daily_food_estimate",
        ],
        properties: {
          city: { type: "string" },
          country: { type: "string" },
          summary: { type: "string" },
          arrival_day: { type: "integer", minimum: 1 },
          departure_day: { type: "integer", minimum: 1 },
          accommodation: {
            type: "object",
            required: ["name", "type", "cost_per_night"],
            properties: {
              name: { type: "string" },
              type: {
                type: "string",
                enum: [
                  "hostel",
                  "budget_hotel",
                  "mid_range_hotel",
                  "boutique",
                  "luxury",
                  "homestay",
                  "airbnb",
                ],
              },
              cost_per_night: { type: "number", minimum: 0 },
            },
          },
          transport_to_next: {
            type: ["object", "null"],
            properties: {
              mode: {
                type: "string",
                enum: ["flight", "train", "bus", "car", "ferry"],
              },
              cost: { type: "number", minimum: 0 },
              duration_hours: { type: "number", minimum: 0 },
            },
          },
          daily_food_estimate: { type: "number", minimum: 0 },
          activities: {
            type: "array",
            items: {
              type: "object",
              required: [
                "name",
                "day",
                "category",
                "estimated_cost",
                "description",
              ],
              properties: {
                name: { type: "string" },
                day: { type: "integer", minimum: 1 },
                category: {
                  type: "string",
                  enum: [
                    "food",
                    "sightseeing",
                    "adventure",
                    "culture",
                    "relaxation",
                    "shopping",
                    "nightlife",
                  ],
                },
                estimated_duration_hours: { type: "number", minimum: 0 },
                estimated_cost: { type: "number", minimum: 0 },
                description: { type: "string" },
                personality_fit: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};
