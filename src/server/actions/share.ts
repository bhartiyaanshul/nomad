"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import crypto from "node:crypto";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, ok, type ActionResult } from "./result";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthenticated");
  return session.user.id;
}

export async function togglePublicAction(
  tripId: string,
  makePublic: boolean,
): Promise<ActionResult<{ shareSlug: string | null }>> {
  const userId = await requireUserId();
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { id: true, ownerId: true, shareSlug: true },
  });
  if (!trip || trip.ownerId !== userId) return fail("Trip not found");

  if (makePublic) {
    let shareSlug = trip.shareSlug;
    if (!shareSlug) shareSlug = nanoid(10);
    await db.trip.update({
      where: { id: tripId },
      data: { isPublic: true, shareSlug },
    });
    revalidatePath(`/trips/${tripId}`);
    return ok({ shareSlug });
  } else {
    await db.trip.update({
      where: { id: tripId },
      data: { isPublic: false, shareSlug: null, viewCount: 0 },
    });
    revalidatePath(`/trips/${tripId}`);
    return ok({ shareSlug: null });
  }
}

export async function copyPublicTripAction(slug: string): Promise<ActionResult<{ tripId: string }>> {
  const userId = await requireUserId();

  const original = await db.trip.findUnique({
    where: { shareSlug: slug },
    include: { stops: { include: { activities: true } } },
  });
  if (!original || !original.isPublic) return fail("Trip not found");

  const created = await db.$transaction(async (tx) => {
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
        isPublic: false,
        shareSlug: null,
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
      const activeActivities = stop.activities.filter((a) => !a.archived);
      if (activeActivities.length > 0) {
        await tx.activity.createMany({
          data: activeActivities.map((a) => ({
            stopId: newStop.id,
            name: a.name,
            description: a.description,
            day: a.day,
            category: a.category,
            estimatedDurationHours: a.estimatedDurationHours,
            estimatedCost: a.estimatedCost,
            personalityFit: a.personalityFit,
          })),
        });
      }
    }

    await tx.userEvent.create({
      data: {
        userId,
        eventType: "trip_copied",
        metadata: JSON.stringify({ from: original.id, to: trip.id }),
      },
    });

    return trip;
  });

  redirect(`/trips/${created.id}`);
}

/** Counts a public-share view, deduped by IP-hash for 24h. */
export async function logShareViewAction(slug: string) {
  const trip = await db.trip.findUnique({
    where: { shareSlug: slug },
    select: { id: true, isPublic: true },
  });
  if (!trip || !trip.isPublic) return;

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown";
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 24);

  try {
    await db.tripView.create({
      data: { tripId: trip.id, ipHash },
    });
    await db.trip.update({
      where: { id: trip.id },
      data: { viewCount: { increment: 1 } },
    });
  } catch {
    // unique constraint hit — same IP within 24h, ignore
  }
}
