import { z } from "zod";

// Aggressively trimmed schema for fast local-model generation.
// What was dropped (and where it comes from instead):
// - personality, currency, total_days        → echoed from user input
// - personality_fit per activity             → unused in UI
// - description per activity                 → derived from name + category
// - estimated_duration_hours per activity    → defaulted by category
// - daily_food_estimate per stop             → derived from budget/days
// - cost_breakdown                           → computed from activities + accom

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
  estimated_cost: z.number().nonnegative(),
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
  activities: z.array(itineraryActivitySchema),
});

export const itinerarySchema = z.object({
  trip_summary: z.string(),
  total_estimated_cost: z.number().nonnegative(),
  stops: z.array(itineraryStopSchema).min(1),
});

export type ItineraryOutput = z.infer<typeof itinerarySchema>;
export type ItineraryStop = z.infer<typeof itineraryStopSchema>;
export type ItineraryActivity = z.infer<typeof itineraryActivitySchema>;

// JSON Schema (draft-07 subset) passed to Ollama's `format` field.
// Mirrors the Zod schema. Keep them in sync.
export const itineraryJsonSchema: Record<string, unknown> = {
  type: "object",
  required: ["trip_summary", "total_estimated_cost", "stops"],
  properties: {
    trip_summary: { type: "string" },
    total_estimated_cost: { type: "number", minimum: 0 },
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
          activities: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "day", "category", "estimated_cost"],
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
                estimated_cost: { type: "number", minimum: 0 },
              },
            },
          },
        },
      },
    },
  },
};
