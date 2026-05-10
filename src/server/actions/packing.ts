"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generate,
  OllamaError,
  OllamaUnavailableError,
} from "@/lib/ai/ollama";
import { PACKING_SYSTEM, renderPackingUser } from "@/lib/ai/prompts/packing";
import { packingJsonSchema, packingSchema } from "@/lib/ai/schemas/packing";
import { fail, ok, type ActionResult } from "./result";

const CATEGORIES = [
  "clothing",
  "documents",
  "electronics",
  "toiletries",
  "gear",
  "misc",
] as const;

const itemSchema = z.object({
  item: z.string().trim().min(1).max(120),
  category: z.enum(CATEGORIES),
  quantity: z.coerce.number().int().min(1).default(1),
  essential: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "on" || v === "true"),
  notes: z.string().max(200).optional().nullable(),
});

async function requireMember(tripId: string, userId: string) {
  const trip = await db.trip.findFirst({
    where: {
      id: tripId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId, status: "active" } } },
      ],
    },
    select: { id: true },
  });
  return Boolean(trip);
}

export async function addPackingItemAction(
  tripId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");
  if (!(await requireMember(tripId, session.user.id))) return fail("Not found");

  const parsed = itemSchema.safeParse({
    item: formData.get("item"),
    category: formData.get("category") || "misc",
    quantity: formData.get("quantity") || 1,
    essential: formData.get("essential") || false,
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) {
    return fail("Check the form", parsed.error.flatten().fieldErrors);
  }

  const created = await db.packingItem.create({
    data: {
      tripId,
      item: parsed.data.item,
      category: parsed.data.category,
      quantity: parsed.data.quantity,
      essential: parsed.data.essential,
      notes: parsed.data.notes ?? null,
    },
  });
  revalidatePath(`/trips/${tripId}/packing`);
  return ok({ id: created.id });
}

export async function togglePackingItemAction(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  const item = await db.packingItem.findUnique({
    where: { id: itemId },
    select: { id: true, packed: true, tripId: true, trip: { select: { ownerId: true, members: { select: { userId: true } } } } },
  });
  if (!item) return;
  const isMember =
    item.trip.ownerId === session.user.id ||
    item.trip.members.some((m) => m.userId === session.user.id);
  if (!isMember) return;
  await db.packingItem.update({
    where: { id: itemId },
    data: { packed: !item.packed },
  });
  revalidatePath(`/trips/${item.tripId}/packing`);
}

export async function deletePackingItemAction(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  const item = await db.packingItem.findUnique({
    where: { id: itemId },
    select: { id: true, tripId: true, trip: { select: { ownerId: true } } },
  });
  if (!item || item.trip.ownerId !== session.user.id) return;
  await db.packingItem.delete({ where: { id: itemId } });
  revalidatePath(`/trips/${item.tripId}/packing`);
}

export async function resetPackingAction(tripId: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { ownerId: true },
  });
  if (!trip || trip.ownerId !== session.user.id) return;
  await db.packingItem.updateMany({
    where: { tripId },
    data: { packed: false },
  });
  revalidatePath(`/trips/${tripId}/packing`);
}

export async function suggestPackingAction(
  tripId: string,
): Promise<ActionResult<{ added: number }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const trip = await db.trip.findFirst({
    where: { id: tripId, ownerId: session.user.id },
    select: {
      id: true,
      personality: true,
      startDate: true,
      endDate: true,
      stops: {
        select: {
          city: true,
          country: true,
          activities: {
            where: { archived: false },
            select: { category: true },
          },
        },
      },
    },
  });
  if (!trip) return fail("Trip not found");

  const month = trip.startDate.toLocaleString("en-US", { month: "long" });
  const days = Math.ceil(
    (trip.endDate.getTime() - trip.startDate.getTime()) /
      (24 * 60 * 60 * 1000),
  );

  const userPrompt = renderPackingUser({
    destClimateList: trip.stops.map((s) => `${s.city}, ${s.country}`),
    days: Math.max(1, days),
    activityCategories: Array.from(
      new Set(trip.stops.flatMap((s) => s.activities.map((a) => a.category))),
    ),
    personality: trip.personality ?? "mixed",
    season: month,
    special: "",
  });

  let result;
  try {
    result = await generate({
      system: PACKING_SYSTEM,
      user: userPrompt,
      schema: packingJsonSchema,
      temperature: 0.3,
      validate: (raw) => packingSchema.parse(raw),
    });
  } catch (err) {
    if (err instanceof OllamaUnavailableError) return fail(err.message);
    if (err instanceof OllamaError) return fail(err.message);
    console.error("[suggestPacking] error", err);
    return fail("Could not generate the packing list");
  }

  // Filter out duplicates by case-insensitive item name.
  const existing = await db.packingItem.findMany({
    where: { tripId },
    select: { item: true },
  });
  const existingSet = new Set(existing.map((e) => e.item.toLowerCase()));

  const toCreate = result.items.filter(
    (i) => !existingSet.has(i.item.toLowerCase()),
  );

  if (toCreate.length > 0) {
    await db.packingItem.createMany({
      data: toCreate.map((i) => ({
        tripId,
        item: i.item,
        category: i.category,
        quantity: i.quantity,
        essential: i.essential,
        notes: i.notes ?? null,
      })),
    });
  }

  revalidatePath(`/trips/${tripId}/packing`);
  return ok({ added: toCreate.length });
}
