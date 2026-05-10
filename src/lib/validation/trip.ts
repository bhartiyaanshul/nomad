import { z } from "zod";

const PERSONALITIES = [
  "foodie",
  "adventurer",
  "culture",
  "chill",
  "social",
  "budget",
  "luxury",
  "mixed",
] as const;

export const personalityEnum = z.enum(PERSONALITIES);

const isoDate = z
  .string()
  .min(1, "Required")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

const tripObjectSchema = z.object({
  name: z.string().trim().min(2, "Name your trip").max(120),
  description: z.string().max(500).optional().nullable(),
  startDate: isoDate,
  endDate: isoDate,
  totalBudget: z.coerce.number().nonnegative().optional().nullable(),
  currency: z.string().min(3).max(4).default("USD"),
  personality: personalityEnum.optional().nullable(),
});

export const createTripSchema = tripObjectSchema.refine(
  (d) => new Date(d.endDate).getTime() >= new Date(d.startDate).getTime(),
  {
    path: ["endDate"],
    message: "End date must be on or after the start date",
  },
);

export type CreateTripInput = z.infer<typeof createTripSchema>;

export const updateTripSchema = tripObjectSchema.partial();

export type UpdateTripInput = z.infer<typeof updateTripSchema>;

export const ACCOM_TYPES = [
  "hostel",
  "budget_hotel",
  "mid_range_hotel",
  "boutique",
  "luxury",
  "homestay",
  "airbnb",
] as const;

export const TRANSPORT_MODES = [
  "flight",
  "train",
  "bus",
  "car",
  "ferry",
] as const;

export const createStopSchema = z.object({
  tripId: z.string().min(1),
  city: z.string().trim().min(1, "City is required").max(80),
  country: z.string().trim().min(1, "Country is required").max(80),
  arrivalDay: z.coerce.number().int().min(1),
  departureDay: z.coerce.number().int().min(1),
  summary: z.string().max(280).optional().nullable(),
  // Accommodation is required when adding a new stop — every traveller
  // needs somewhere to sleep, and the budget calculation depends on it.
  accomName: z.string().trim().min(1, "Accommodation name is required").max(120),
  accomType: z.enum(ACCOM_TYPES, { message: "Pick an accommodation type" }),
  accomCostPerNight: z.coerce
    .number({ message: "Per-night cost is required" })
    .nonnegative(),
  transportMode: z.enum(TRANSPORT_MODES).optional().nullable(),
  transportCost: z.coerce.number().nonnegative().optional().nullable(),
  transportHours: z.coerce.number().nonnegative().optional().nullable(),
  dailyFoodEstimate: z.coerce.number().nonnegative().optional().nullable(),
});

export type CreateStopInput = z.infer<typeof createStopSchema>;

export const updateStopSchema = createStopSchema.partial();

export type UpdateStopInput = z.infer<typeof updateStopSchema>;

export const ACTIVITY_CATEGORIES = [
  "food",
  "sightseeing",
  "adventure",
  "culture",
  "relaxation",
  "shopping",
  "nightlife",
] as const;

export const createActivitySchema = z.object({
  stopId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).default(""),
  day: z.coerce.number().int().min(1),
  category: z.enum(ACTIVITY_CATEGORIES),
  estimatedDurationHours: z.coerce.number().nonnegative().optional().nullable(),
  estimatedCost: z.coerce.number().nonnegative().default(0),
  bookingUrl: z
    .string()
    .url()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  imageUrl: z
    .string()
    .url()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const updateActivitySchema = createActivitySchema.partial();

export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

export function tripDurationDays(
  start: Date | string,
  end: Date | string,
): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / (24 * 60 * 60 * 1000)) + 1);
}
