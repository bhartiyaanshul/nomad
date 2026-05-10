"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTripSchema, updateTripSchema } from "@/lib/validation/trip";
import { seedDefaultTodosFor } from "./todos";
import { fail, ok, type ActionResult } from "./result";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthenticated");
  return session.user.id;
}

async function requireTripOwnership(tripId: string, userId: string) {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { id: true, ownerId: true },
  });
  if (!trip || trip.ownerId !== userId) {
    throw new Error("Trip not found");
  }
}

export async function createTripAction(
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ tripId: string }>> {
  const userId = await requireUserId();

  const rawPersonality = formData.get("personality");
  const personality =
    rawPersonality && rawPersonality !== "none" ? rawPersonality : null;

  const parsed = createTripSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    totalBudget: formData.get("totalBudget") || null,
    currency: formData.get("currency") || "USD",
    personality,
  });

  if (!parsed.success) {
    return fail(
      "Check the highlighted fields",
      parsed.error.flatten().fieldErrors,
    );
  }

  const trip = await db.trip.create({
    data: {
      ownerId: userId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      totalBudget: parsed.data.totalBudget ?? null,
      currency: parsed.data.currency ?? "USD",
      personality: parsed.data.personality ?? null,
    },
  });

  // Auto-add the owner as a TripMember with the owner role.
  await db.tripMember.create({
    data: { tripId: trip.id, userId, role: "owner" },
  });

  // Seed the standard prep checklist (visa, passport, vaccinations, insurance,
  // currency, online check-in, etc.). Reminders are auto-scheduled.
  // Defaults to the international set on creation (no stops yet) — the
  // owner can delete anything that doesn't apply.
  try {
    await seedDefaultTodosFor({
      tripId: trip.id,
      ownerId: userId,
      isInternational: true,
      tripStart: trip.startDate,
    });
  } catch (err) {
    console.warn("[trips:create] failed to seed default todos", err);
  }

  revalidatePath("/dashboard");
  revalidatePath("/trips");
  redirect(`/trips/${trip.id}/build`);
}

export async function updateTripAction(
  tripId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ updated: true }>> {
  const userId = await requireUserId();
  await requireTripOwnership(tripId, userId);

  const parsed = updateTripSchema.safeParse({
    name: formData.get("name") || undefined,
    description: formData.get("description") ?? undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    totalBudget: formData.get("totalBudget") ?? undefined,
    currency: formData.get("currency") || undefined,
    personality: formData.get("personality") ?? undefined,
  });

  if (!parsed.success) {
    return fail(
      "Check the highlighted fields",
      parsed.error.flatten().fieldErrors,
    );
  }

  await db.trip.update({
    where: { id: tripId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description ?? null }
        : {}),
      ...(parsed.data.startDate
        ? { startDate: new Date(parsed.data.startDate) }
        : {}),
      ...(parsed.data.endDate
        ? { endDate: new Date(parsed.data.endDate) }
        : {}),
      ...(parsed.data.totalBudget !== undefined
        ? { totalBudget: parsed.data.totalBudget ?? null }
        : {}),
      ...(parsed.data.currency ? { currency: parsed.data.currency } : {}),
      ...(parsed.data.personality !== undefined
        ? { personality: parsed.data.personality ?? null }
        : {}),
    },
  });

  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/build`);
  revalidatePath("/trips");
  return ok({ updated: true });
}

export async function deleteTripAction(tripId: string) {
  const userId = await requireUserId();
  await requireTripOwnership(tripId, userId);
  await db.trip.delete({ where: { id: tripId } });
  revalidatePath("/trips");
  revalidatePath("/dashboard");
  redirect("/trips");
}

export async function duplicateTripAction(tripId: string) {
  const userId = await requireUserId();
  await requireTripOwnership(tripId, userId);

  const original = await db.trip.findUnique({
    where: { id: tripId },
    include: { stops: { include: { activities: true } } },
  });
  if (!original) throw new Error("Trip not found");

  const copy = await db.$transaction(async (tx) => {
    const trip = await tx.trip.create({
      data: {
        ownerId: userId,
        name: `${original.name} (copy)`,
        description: original.description,
        coverImageUrl: original.coverImageUrl,
        startDate: original.startDate,
        endDate: original.endDate,
        totalBudget: original.totalBudget,
        currency: original.currency,
        personality: original.personality,
        status: "draft",
      },
    });

    await tx.tripMember.create({
      data: { tripId: trip.id, userId, role: "owner" },
    });

    for (const stop of original.stops) {
      const newStop = await tx.stop.create({
        data: {
          tripId: trip.id,
          city: stop.city,
          country: stop.country,
          latitude: stop.latitude,
          longitude: stop.longitude,
          arrivalDay: stop.arrivalDay,
          departureDay: stop.departureDay,
          orderIndex: stop.orderIndex,
          summary: stop.summary,
          accomName: stop.accomName,
          accomType: stop.accomType,
          accomCostPerNight: stop.accomCostPerNight,
          transportMode: stop.transportMode,
          transportCost: stop.transportCost,
          transportHours: stop.transportHours,
          dailyFoodEstimate: stop.dailyFoodEstimate,
        },
      });
      if (stop.activities.length > 0) {
        await tx.activity.createMany({
          data: stop.activities.map((a) => ({
            stopId: newStop.id,
            name: a.name,
            description: a.description,
            day: a.day,
            category: a.category,
            estimatedDurationHours: a.estimatedDurationHours,
            estimatedCost: a.estimatedCost,
            personalityFit: a.personalityFit,
            imageUrl: a.imageUrl,
            bookingUrl: a.bookingUrl,
          })),
        });
      }
    }

    return trip;
  });

  revalidatePath("/trips");
  redirect(`/trips/${copy.id}/build`);
}
