"use server";

import { revalidatePath } from "next/cache";

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
} from "@/lib/ai/schemas/itinerary";
import { fail, ok, type ActionResult } from "./result";

export async function regenerateStopAction(
  stopId: string,
): Promise<ActionResult<{ replaced: number }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const stop = await db.stop.findUnique({
    where: { id: stopId },
    select: {
      id: true,
      city: true,
      country: true,
      arrivalDay: true,
      departureDay: true,
      tripId: true,
      trip: {
        select: {
          ownerId: true,
          totalBudget: true,
          currency: true,
          personality: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });
  if (!stop || stop.trip.ownerId !== session.user.id) {
    return fail("Stop not found");
  }

  const days = stop.departureDay - stop.arrivalDay + 1;
  const personality = stop.trip.personality ?? "mixed";
  const currency = stop.trip.currency ?? "USD";
  const budgetForStop = Math.max(
    100,
    Math.round((stop.trip.totalBudget ?? 1000) / 4),
  );

  const userPrompt = renderItineraryUser({
    region: `${stop.city}, ${stop.country}`,
    days,
    budget: budgetForStop,
    currency,
    personality,
    numStops: 1,
    discoveryMode: "popular",
    startDate: stop.trip.startDate.toISOString().slice(0, 10),
  });

  try {
    const result = await generate({
      system: ITINERARY_SYSTEM,
      user: userPrompt,
      schema: itineraryJsonSchema,
      temperature: 0.7,
      validate: (raw) => itinerarySchema.parse(raw),
    });

    const newStop = result.stops[0];
    if (!newStop) return fail("AI returned no activities");

    await db.$transaction(async (tx) => {
      // Archive existing activities for "undo" later (Phase 8 expands on this).
      await tx.activity.updateMany({
        where: { stopId },
        data: { archived: true },
      });

      const dayShift = stop.arrivalDay - newStop.arrival_day;
      await tx.activity.createMany({
        data: newStop.activities.map((a) => ({
          stopId,
          name: a.name,
          description: a.description,
          day: Math.min(
            stop.departureDay,
            Math.max(stop.arrivalDay, a.day + dayShift),
          ),
          category: a.category,
          estimatedDurationHours: a.estimated_duration_hours ?? null,
          estimatedCost: a.estimated_cost,
          personalityFit: a.personality_fit ?? null,
        })),
      });

      // Refresh stop summary if AI returned one and the existing was empty.
      if (newStop.summary) {
        await tx.stop.update({
          where: { id: stopId },
          data: {
            summary: newStop.summary,
            accomName: newStop.accommodation?.name ?? undefined,
            accomType: newStop.accommodation?.type ?? undefined,
            accomCostPerNight:
              newStop.accommodation?.cost_per_night ?? undefined,
            dailyFoodEstimate: newStop.daily_food_estimate ?? undefined,
          },
        });
      }
    });

    revalidatePath(`/trips/${stop.tripId}/build`);
    revalidatePath(`/trips/${stop.tripId}`);

    return ok({ replaced: newStop.activities.length });
  } catch (err) {
    if (err instanceof OllamaUnavailableError) {
      return fail(err.message);
    }
    if (err instanceof OllamaError) {
      return fail(err.message);
    }
    console.error("[regenerateStop] error", err);
    return fail("Could not regenerate this stop");
  }
}
