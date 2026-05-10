import { NextResponse } from "next/server";
import { z } from "zod";
import { addDays } from "date-fns";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generate,
  OllamaError,
  OllamaUnavailableError,
} from "@/lib/ai/ollama";
import {
  ITINERARY_SYSTEM,
  renderItineraryUser,
} from "@/lib/ai/prompts/itinerary";
import {
  itineraryJsonSchema,
  itinerarySchema,
  type ItineraryOutput,
} from "@/lib/ai/schemas/itinerary";
import { geocodeCity } from "@/lib/geocode";
import { seedDefaultTodosFor } from "@/server/actions/todos";

export const runtime = "nodejs";
// AI calls take many seconds; bump default timeout.
export const maxDuration = 180;

const personalityEnum = z.enum([
  "foodie",
  "adventurer",
  "culture",
  "chill",
  "social",
  "budget",
  "luxury",
  "mixed",
]);

const requestSchema = z.object({
  region: z.string().trim().min(2).max(120),
  days: z.coerce.number().int().min(1).max(60),
  budget: z.coerce.number().nonnegative().max(1_000_000),
  currency: z.string().min(3).max(4).default("USD"),
  personality: personalityEnum,
  numStops: z.coerce.number().int().min(1).max(12).default(3),
  discoveryMode: z.enum(["popular", "explore"]).default("popular"),
  startDate: z
    .string()
    .min(4)
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date"),
  tripName: z.string().trim().max(120).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const userPrompt = renderItineraryUser({
    region: parsed.data.region,
    days: parsed.data.days,
    budget: parsed.data.budget,
    currency: parsed.data.currency,
    personality: parsed.data.personality,
    numStops: parsed.data.numStops,
    discoveryMode: parsed.data.discoveryMode,
    startDate: parsed.data.startDate,
  });

  let itinerary: ItineraryOutput;
  try {
    itinerary = await generate({
      system: ITINERARY_SYSTEM,
      user: userPrompt,
      schema: itineraryJsonSchema,
      temperature: 0.7,
      timeoutMs: 150_000,
      validate: (raw) => itinerarySchema.parse(raw),
    });
  } catch (err) {
    if (err instanceof OllamaUnavailableError) {
      return NextResponse.json(
        { error: err.message, code: "ollama_unavailable" },
        { status: 503 },
      );
    }
    if (err instanceof OllamaError) {
      console.error("[ai/itinerary] Ollama error", err);
      return NextResponse.json(
        { error: err.message, code: "ollama_error" },
        { status: 502 },
      );
    }
    if (err instanceof z.ZodError) {
      console.error(
        "[ai/itinerary] schema validation failed",
        err.flatten(),
      );
      return NextResponse.json(
        {
          error: "AI returned a malformed response. Try again.",
          code: "schema_invalid",
        },
        { status: 502 },
      );
    }
    console.error("[ai/itinerary] unexpected", err);
    return NextResponse.json(
      { error: "Itinerary generation failed" },
      { status: 500 },
    );
  }

  // Geocode each stop sequentially (rate-limited inside the wrapper).
  const startDate = new Date(parsed.data.startDate);
  const endDate = addDays(startDate, Math.max(1, itinerary.total_days) - 1);

  const stopsWithCoords = await Promise.all(
    itinerary.stops.map(async (s) => {
      const coords = await geocodeCity(s.city, s.country);
      return { ...s, coords };
    }),
  );

  // Persist: trip + stops + activities in one transaction.
  const tripName =
    parsed.data.tripName?.trim() ||
    `${parsed.data.region} · ${parsed.data.personality} · ${parsed.data.days}d`;

  const created = await db.$transaction(async (tx) => {
    const trip = await tx.trip.create({
      data: {
        ownerId: session.user.id,
        name: tripName,
        description: itinerary.trip_summary,
        startDate,
        endDate,
        totalBudget: parsed.data.budget,
        currency: parsed.data.currency,
        personality: parsed.data.personality,
      },
    });

    await tx.tripMember.create({
      data: { tripId: trip.id, userId: session.user.id, role: "owner" },
    });

    for (let i = 0; i < stopsWithCoords.length; i++) {
      const s = stopsWithCoords[i];
      const transport = s.transport_to_next ?? null;

      const stop = await tx.stop.create({
        data: {
          tripId: trip.id,
          city: s.city,
          country: s.country,
          latitude: s.coords?.latitude ?? null,
          longitude: s.coords?.longitude ?? null,
          arrivalDay: s.arrival_day,
          departureDay: s.departure_day,
          orderIndex: i,
          summary: s.summary,
          accomName: s.accommodation.name,
          accomType: s.accommodation.type,
          accomCostPerNight: s.accommodation.cost_per_night,
          dailyFoodEstimate: s.daily_food_estimate,
          transportMode: transport?.mode ?? null,
          transportCost: transport?.cost ?? null,
          transportHours: transport?.duration_hours ?? null,
        },
      });

      if (s.activities.length > 0) {
        await tx.activity.createMany({
          data: s.activities.map((a) => ({
            stopId: stop.id,
            name: a.name,
            description: a.description,
            day: a.day,
            category: a.category,
            estimatedDurationHours: a.estimated_duration_hours ?? null,
            estimatedCost: a.estimated_cost,
            personalityFit: a.personality_fit ?? null,
          })),
        });
      }
    }

    await tx.userEvent.create({
      data: {
        userId: session.user.id,
        eventType: "ai_itinerary_generated",
        metadata: JSON.stringify({
          tripId: trip.id,
          region: parsed.data.region,
          days: parsed.data.days,
          numStops: parsed.data.numStops,
          personality: parsed.data.personality,
        }),
      },
    });

    return trip;
  });

  // Seed the standard prep checklist with auto-scheduled reminders.
  // Heuristic: international if any stop's country is non-US; we don't
  // store the user's home country, so default to international (the most
  // common AI-generated trip is multi-country) and let the user delete
  // anything that doesn't apply.
  const distinctCountries = new Set(
    stopsWithCoords.map((s) => s.country.trim()),
  );
  try {
    await seedDefaultTodosFor({
      tripId: created.id,
      ownerId: session.user.id,
      isInternational: distinctCountries.size > 0,
      tripStart: startDate,
    });
  } catch (err) {
    console.warn("[ai/itinerary] failed to seed default todos", err);
  }

  return NextResponse.json({
    tripId: created.id,
    summary: itinerary.trip_summary,
    totalEstimatedCost: itinerary.total_estimated_cost,
    stopsCreated: stopsWithCoords.length,
  });
}

