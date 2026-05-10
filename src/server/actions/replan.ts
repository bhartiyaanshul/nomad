"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { geocodeCity } from "@/lib/geocode";
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

export interface SwapStopInput {
  stopId: string;
  newCity: string;
  newCountry: string;
  reason: string;
  transportMode?: string | null;
  transportHours?: number | null;
}

export async function swapStopAction(
  input: SwapStopInput,
): Promise<ActionResult<{ swapId: string; replaced: number }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const stop = await db.stop.findUnique({
    where: { id: input.stopId },
    include: {
      trip: {
        select: {
          id: true,
          ownerId: true,
          currency: true,
          personality: true,
          totalBudget: true,
          startDate: true,
        },
      },
    },
  });
  if (!stop || stop.trip.ownerId !== session.user.id) {
    return fail("Stop not found");
  }

  const days = Math.max(1, stop.departureDay - stop.arrivalDay + 1);
  const personality = stop.trip.personality ?? "mixed";
  const currency = stop.trip.currency;
  const budgetForStop = Math.max(
    100,
    Math.round((stop.trip.totalBudget ?? 1000) / 4),
  );

  const userPrompt = renderItineraryUser({
    region: `${input.newCity}, ${input.newCountry}`,
    days,
    budget: budgetForStop,
    currency,
    personality,
    numStops: 1,
    discoveryMode: "popular",
    startDate: stop.trip.startDate.toISOString().slice(0, 10),
  });

  let newStopData;
  try {
    const result = await generate({
      system: ITINERARY_SYSTEM,
      user: userPrompt,
      schema: itineraryJsonSchema,
      temperature: 0.7,
      validate: (raw) => itinerarySchema.parse(raw),
    });
    newStopData = result.stops[0];
  } catch (err) {
    if (err instanceof OllamaUnavailableError) return fail(err.message);
    if (err instanceof OllamaError) return fail(err.message);
    console.error("[swapStop] AI failure", err);
    return fail("Could not generate the new stop's plan");
  }

  if (!newStopData) return fail("AI returned no plan for the new city");

  const coords = await geocodeCity(input.newCity, input.newCountry);

  // Snapshot the original for an undo: capture the previous city, country,
  // accommodation, and activity ids in a UserEvent metadata blob.
  const undoSnapshot = {
    stopId: stop.id,
    previous: {
      city: stop.city,
      country: stop.country,
      latitude: stop.latitude,
      longitude: stop.longitude,
      summary: stop.summary,
      accomName: stop.accomName,
      accomType: stop.accomType,
      accomCostPerNight: stop.accomCostPerNight,
      transportMode: stop.transportMode,
      transportCost: stop.transportCost,
      transportHours: stop.transportHours,
      dailyFoodEstimate: stop.dailyFoodEstimate,
      isCompromised: stop.isCompromised,
    },
    activityIds: (await db.activity.findMany({
      where: { stopId: stop.id, archived: false },
      select: { id: true },
    })).map((a) => a.id),
    swappedAt: new Date().toISOString(),
  };

  const dayShift = stop.arrivalDay - newStopData.arrival_day;

  const swapEvent = await db.$transaction(async (tx) => {
    // Archive existing activities so they can be restored on undo.
    await tx.activity.updateMany({
      where: { stopId: stop.id, archived: false },
      data: { archived: true },
    });

    await tx.stop.update({
      where: { id: stop.id },
      data: {
        city: input.newCity,
        country: input.newCountry,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        summary: newStopData.summary ?? null,
        accomName: newStopData.accommodation?.name ?? null,
        accomType: newStopData.accommodation?.type ?? null,
        accomCostPerNight: newStopData.accommodation?.cost_per_night ?? null,
        dailyFoodEstimate: newStopData.daily_food_estimate ?? null,
        transportMode: input.transportMode ?? stop.transportMode ?? null,
        transportHours: input.transportHours ?? stop.transportHours ?? null,
        isCompromised: false,
      },
    });

    if (newStopData.activities.length > 0) {
      await tx.activity.createMany({
        data: newStopData.activities.map((a) => ({
          stopId: stop.id,
          name: a.name,
          description: a.description,
          day: Math.min(
            stop.departureDay,
            Math.max(stop.arrivalDay, a.day + dayShift),
          ),
          category: a.category,
          estimatedCost: a.estimated_cost,
          estimatedDurationHours: a.estimated_duration_hours ?? null,
          personalityFit: a.personality_fit ?? null,
        })),
      });
    }

    const event = await tx.userEvent.create({
      data: {
        userId: session.user.id,
        eventType: "stop_swapped",
        metadata: JSON.stringify({
          tripId: stop.trip.id,
          reason: input.reason,
          undo: undoSnapshot,
          to: { city: input.newCity, country: input.newCountry },
        }),
      },
    });

    return event;
  });

  revalidatePath(`/trips/${stop.trip.id}/build`);
  revalidatePath(`/trips/${stop.trip.id}`);
  return ok({
    swapId: swapEvent.id,
    replaced: newStopData.activities.length,
  });
}

export async function undoStopSwapAction(
  swapId: string,
): Promise<ActionResult<{ restored: true }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const event = await db.userEvent.findUnique({
    where: { id: swapId },
    select: { id: true, userId: true, eventType: true, metadata: true },
  });
  if (
    !event ||
    event.eventType !== "stop_swapped" ||
    event.userId !== session.user.id
  ) {
    return fail("Cannot undo this swap");
  }

  let snapshot: {
    tripId: string;
    undo: {
      stopId: string;
      previous: {
        city: string;
        country: string;
        latitude: number | null;
        longitude: number | null;
        summary: string | null;
        accomName: string | null;
        accomType: string | null;
        accomCostPerNight: number | null;
        transportMode: string | null;
        transportCost: number | null;
        transportHours: number | null;
        dailyFoodEstimate: number | null;
        isCompromised: boolean;
      };
      activityIds: string[];
    };
  };
  try {
    snapshot = JSON.parse(event.metadata ?? "{}");
  } catch {
    return fail("Snapshot is unreadable");
  }

  await db.$transaction(async (tx) => {
    // Delete the AI-generated activities created since the swap.
    await tx.activity.deleteMany({
      where: { stopId: snapshot.undo.stopId, archived: false },
    });

    // Restore the archived originals.
    if (snapshot.undo.activityIds.length > 0) {
      await tx.activity.updateMany({
        where: { id: { in: snapshot.undo.activityIds } },
        data: { archived: false },
      });
    }

    // Restore the stop fields.
    await tx.stop.update({
      where: { id: snapshot.undo.stopId },
      data: { ...snapshot.undo.previous },
    });

    // Mark the event as undone so it can't be applied twice.
    await tx.userEvent.update({
      where: { id: event.id },
      data: { eventType: "stop_swap_undone" },
    });
  });

  revalidatePath(`/trips/${snapshot.tripId}/build`);
  revalidatePath(`/trips/${snapshot.tripId}`);
  return ok({ restored: true });
}

export async function setStopCompromisedAction(
  stopId: string,
  compromised: boolean,
) {
  const session = await auth();
  if (!session?.user?.id) return;

  const stop = await db.stop.findUnique({
    where: { id: stopId },
    select: { tripId: true, trip: { select: { ownerId: true } } },
  });
  if (!stop || stop.trip.ownerId !== session.user.id) return;

  await db.stop.update({
    where: { id: stopId },
    data: { isCompromised: compromised },
  });

  revalidatePath(`/trips/${stop.tripId}/build`);
  revalidatePath(`/trips/${stop.tripId}`);
}
