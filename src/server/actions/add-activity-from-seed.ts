"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACTIVITY_CATEGORIES } from "@/lib/validation/trip";
import { fail, ok, type ActionResult } from "./result";

const inputSchema = z.object({
  stopId: z.string().min(1),
  day: z.number().int().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().default(""),
  category: z.enum(ACTIVITY_CATEGORIES),
  estimatedCost: z.number().nonnegative(),
  estimatedDurationHours: z.number().nonnegative().optional(),
});

export async function addActivityFromSeed(
  input: z.infer<typeof inputSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid activity");

  const stop = await db.stop.findUnique({
    where: { id: parsed.data.stopId },
    select: {
      id: true,
      tripId: true,
      arrivalDay: true,
      departureDay: true,
      trip: { select: { ownerId: true } },
    },
  });
  if (!stop || stop.trip.ownerId !== session.user.id) {
    return fail("Stop not found");
  }

  const day = Math.max(
    stop.arrivalDay,
    Math.min(stop.departureDay, parsed.data.day),
  );

  const created = await db.activity.create({
    data: {
      stopId: stop.id,
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      day,
      category: parsed.data.category,
      estimatedCost: parsed.data.estimatedCost,
      estimatedDurationHours: parsed.data.estimatedDurationHours ?? null,
    },
  });

  revalidatePath(`/trips/${stop.tripId}/build`);
  revalidatePath(`/trips/${stop.tripId}`);
  return ok({ id: created.id });
}
