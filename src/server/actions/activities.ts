"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createActivitySchema,
  updateActivitySchema,
} from "@/lib/validation/trip";
import { fail, ok, type ActionResult } from "./result";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthenticated");
  return session.user.id;
}

async function ownsActivity(activityId: string, userId: string) {
  const a = await db.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      stopId: true,
      stop: {
        select: { tripId: true, trip: { select: { ownerId: true } } },
      },
    },
  });
  if (!a || a.stop.trip.ownerId !== userId) throw new Error("Not found");
  return { tripId: a.stop.tripId, stopId: a.stopId };
}

export async function createActivityAction(
  stopId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const stop = await db.stop.findUnique({
    where: { id: stopId },
    select: {
      id: true,
      tripId: true,
      arrivalDay: true,
      departureDay: true,
      trip: { select: { ownerId: true } },
    },
  });
  if (!stop || stop.trip.ownerId !== userId) throw new Error("Not found");

  const parsed = createActivitySchema.safeParse({
    stopId,
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    day: formData.get("day"),
    category: formData.get("category"),
    estimatedDurationHours: formData.get("estimatedDurationHours") || null,
    estimatedCost: formData.get("estimatedCost") || 0,
    bookingUrl: formData.get("bookingUrl") || null,
  });

  if (!parsed.success) {
    return fail(
      "Check the activity details",
      parsed.error.flatten().fieldErrors,
    );
  }

  if (
    parsed.data.day < stop.arrivalDay ||
    parsed.data.day > stop.departureDay
  ) {
    return fail("Day is outside this stop's range", {
      day: [
        `Pick a day between ${stop.arrivalDay} and ${stop.departureDay}`,
      ],
    });
  }

  const created = await db.activity.create({
    data: {
      stopId,
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      day: parsed.data.day,
      category: parsed.data.category,
      estimatedDurationHours: parsed.data.estimatedDurationHours ?? null,
      estimatedCost: parsed.data.estimatedCost ?? 0,
      bookingUrl: parsed.data.bookingUrl ?? null,
    },
  });

  revalidatePath(`/trips/${stop.tripId}/build`);
  revalidatePath(`/trips/${stop.tripId}`);
  return ok({ id: created.id });
}

export async function updateActivityAction(
  activityId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ updated: true }>> {
  const userId = await requireUserId();
  const meta = await ownsActivity(activityId, userId);

  const parsed = updateActivitySchema.safeParse({
    stopId: meta.stopId,
    name: formData.get("name") ?? undefined,
    description: formData.get("description") ?? undefined,
    day: formData.get("day") ?? undefined,
    category: formData.get("category") ?? undefined,
    estimatedDurationHours: formData.get("estimatedDurationHours") ?? undefined,
    estimatedCost: formData.get("estimatedCost") ?? undefined,
    bookingUrl: formData.get("bookingUrl") ?? undefined,
  });

  if (!parsed.success) {
    return fail(
      "Check the activity details",
      parsed.error.flatten().fieldErrors,
    );
  }

  await db.activity.update({
    where: { id: activityId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description ?? "" }
        : {}),
      ...(parsed.data.day !== undefined ? { day: parsed.data.day } : {}),
      ...(parsed.data.category !== undefined
        ? { category: parsed.data.category }
        : {}),
      ...(parsed.data.estimatedDurationHours !== undefined
        ? { estimatedDurationHours: parsed.data.estimatedDurationHours ?? null }
        : {}),
      ...(parsed.data.estimatedCost !== undefined
        ? { estimatedCost: parsed.data.estimatedCost ?? 0 }
        : {}),
      ...(parsed.data.bookingUrl !== undefined
        ? { bookingUrl: parsed.data.bookingUrl ?? null }
        : {}),
    },
  });

  revalidatePath(`/trips/${meta.tripId}/build`);
  revalidatePath(`/trips/${meta.tripId}`);
  return ok({ updated: true });
}

export async function deleteActivityAction(activityId: string) {
  const userId = await requireUserId();
  const meta = await ownsActivity(activityId, userId);
  await db.activity.delete({ where: { id: activityId } });
  revalidatePath(`/trips/${meta.tripId}/build`);
  revalidatePath(`/trips/${meta.tripId}`);
}
