"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createStopSchema,
  tripDurationDays,
  updateStopSchema,
} from "@/lib/validation/trip";
import { fail, ok, type ActionResult } from "./result";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthenticated");
  return session.user.id;
}

async function requireOwnedTrip(tripId: string, userId: string) {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      ownerId: true,
      startDate: true,
      endDate: true,
    },
  });
  if (!trip || trip.ownerId !== userId) throw new Error("Trip not found");
  return trip;
}

export async function createStopAction(
  tripId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ stopId: string }>> {
  const userId = await requireUserId();
  const trip = await requireOwnedTrip(tripId, userId);

  const parsed = createStopSchema.safeParse({
    tripId,
    city: formData.get("city"),
    country: formData.get("country"),
    arrivalDay: formData.get("arrivalDay"),
    departureDay: formData.get("departureDay"),
    summary: formData.get("summary") || null,
    accomName: formData.get("accomName") || null,
    accomType: formData.get("accomType") || null,
    accomCostPerNight: formData.get("accomCostPerNight") || null,
    transportMode: formData.get("transportMode") || null,
    transportCost: formData.get("transportCost") || null,
    transportHours: formData.get("transportHours") || null,
    dailyFoodEstimate: formData.get("dailyFoodEstimate") || null,
  });

  if (!parsed.success) {
    return fail(
      "Check the stop details",
      parsed.error.flatten().fieldErrors,
    );
  }

  const totalDays = tripDurationDays(trip.startDate, trip.endDate);
  if (parsed.data.departureDay > totalDays) {
    return fail("Departure day exceeds the trip duration", {
      departureDay: ["Outside trip range"],
    });
  }
  if (parsed.data.arrivalDay > parsed.data.departureDay) {
    return fail("Arrival must be before departure", {
      arrivalDay: ["Must be on or before departure"],
    });
  }

  const last = await db.stop.findFirst({
    where: { tripId },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true },
  });

  const stop = await db.stop.create({
    data: {
      tripId,
      city: parsed.data.city,
      country: parsed.data.country,
      arrivalDay: parsed.data.arrivalDay,
      departureDay: parsed.data.departureDay,
      orderIndex: (last?.orderIndex ?? -1) + 1,
      summary: parsed.data.summary ?? null,
      accomName: parsed.data.accomName ?? null,
      accomType: parsed.data.accomType ?? null,
      accomCostPerNight: parsed.data.accomCostPerNight ?? null,
      transportMode: parsed.data.transportMode ?? null,
      transportCost: parsed.data.transportCost ?? null,
      transportHours: parsed.data.transportHours ?? null,
      dailyFoodEstimate: parsed.data.dailyFoodEstimate ?? null,
    },
  });

  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/build`);
  return ok({ stopId: stop.id });
}

export async function updateStopAction(
  stopId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ updated: true }>> {
  const userId = await requireUserId();
  const stop = await db.stop.findUnique({
    where: { id: stopId },
    select: { id: true, tripId: true, trip: { select: { ownerId: true, startDate: true, endDate: true } } },
  });
  if (!stop || stop.trip.ownerId !== userId) throw new Error("Not found");

  const parsed = updateStopSchema.safeParse({
    tripId: stop.tripId,
    city: formData.get("city") ?? undefined,
    country: formData.get("country") ?? undefined,
    arrivalDay: formData.get("arrivalDay") ?? undefined,
    departureDay: formData.get("departureDay") ?? undefined,
    summary: formData.get("summary") ?? undefined,
    accomName: formData.get("accomName") ?? undefined,
    accomType: formData.get("accomType") ?? undefined,
    accomCostPerNight: formData.get("accomCostPerNight") ?? undefined,
    transportMode: formData.get("transportMode") ?? undefined,
    transportCost: formData.get("transportCost") ?? undefined,
    transportHours: formData.get("transportHours") ?? undefined,
    dailyFoodEstimate: formData.get("dailyFoodEstimate") ?? undefined,
  });

  if (!parsed.success) {
    return fail("Check the stop details", parsed.error.flatten().fieldErrors);
  }

  await db.stop.update({
    where: { id: stopId },
    data: {
      ...(parsed.data.city !== undefined ? { city: parsed.data.city } : {}),
      ...(parsed.data.country !== undefined
        ? { country: parsed.data.country }
        : {}),
      ...(parsed.data.arrivalDay !== undefined
        ? { arrivalDay: parsed.data.arrivalDay }
        : {}),
      ...(parsed.data.departureDay !== undefined
        ? { departureDay: parsed.data.departureDay }
        : {}),
      ...(parsed.data.summary !== undefined
        ? { summary: parsed.data.summary ?? null }
        : {}),
      ...(parsed.data.accomName !== undefined
        ? { accomName: parsed.data.accomName ?? null }
        : {}),
      ...(parsed.data.accomType !== undefined
        ? { accomType: parsed.data.accomType ?? null }
        : {}),
      ...(parsed.data.accomCostPerNight !== undefined
        ? { accomCostPerNight: parsed.data.accomCostPerNight ?? null }
        : {}),
      ...(parsed.data.transportMode !== undefined
        ? { transportMode: parsed.data.transportMode ?? null }
        : {}),
      ...(parsed.data.transportCost !== undefined
        ? { transportCost: parsed.data.transportCost ?? null }
        : {}),
      ...(parsed.data.transportHours !== undefined
        ? { transportHours: parsed.data.transportHours ?? null }
        : {}),
      ...(parsed.data.dailyFoodEstimate !== undefined
        ? { dailyFoodEstimate: parsed.data.dailyFoodEstimate ?? null }
        : {}),
    },
  });

  revalidatePath(`/trips/${stop.tripId}/build`);
  revalidatePath(`/trips/${stop.tripId}`);
  return ok({ updated: true });
}

export async function deleteStopAction(stopId: string) {
  const userId = await requireUserId();
  const stop = await db.stop.findUnique({
    where: { id: stopId },
    select: { id: true, tripId: true, trip: { select: { ownerId: true } } },
  });
  if (!stop || stop.trip.ownerId !== userId) return;

  await db.stop.delete({ where: { id: stopId } });

  revalidatePath(`/trips/${stop.tripId}/build`);
  revalidatePath(`/trips/${stop.tripId}`);
}

const reorderSchema = z.object({
  tripId: z.string(),
  orderedIds: z.array(z.string()).min(1),
});

export async function reorderStopsAction(input: {
  tripId: string;
  orderedIds: string[];
}) {
  const userId = await requireUserId();
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return;
  await requireOwnedTrip(parsed.data.tripId, userId);

  await db.$transaction(
    parsed.data.orderedIds.map((id, index) =>
      db.stop.update({
        where: { id },
        data: { orderIndex: index },
      }),
    ),
  );

  revalidatePath(`/trips/${parsed.data.tripId}/build`);
  revalidatePath(`/trips/${parsed.data.tripId}`);
}
