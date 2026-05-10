"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { convertAmount } from "@/lib/currency";
import {
  splitExpense,
  type SplitMode,
} from "@/lib/splitwise";
import { fail, ok, type ActionResult } from "./result";

const SPLIT_MODES = ["equal", "by_share", "by_exact", "by_percentage"] as const;
const CATEGORIES = ["transport", "accommodation", "food", "activity", "misc"] as const;

const addExpenseSchema = z.object({
  payerId: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(4),
  description: z.string().trim().min(1).max(200),
  category: z.enum(CATEGORIES),
  splitMode: z.enum(SPLIT_MODES),
  participantIds: z.array(z.string()).min(1),
  weights: z.record(z.string(), z.coerce.number()).optional(),
});

export async function addExpenseAction(
  tripId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const trip = await db.trip.findFirst({
    where: {
      id: tripId,
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id, status: "active" } } },
      ],
    },
    select: {
      id: true,
      currency: true,
      members: { select: { userId: true } },
    },
  });
  if (!trip) return fail("Trip not found");

  const participants = formData.getAll("participantIds").map(String);
  const weightsRaw: Record<string, string> = {};
  for (const userId of participants) {
    const v = formData.get(`weight-${userId}`);
    if (v !== null && v !== "") weightsRaw[userId] = String(v);
  }

  const parsed = addExpenseSchema.safeParse({
    payerId: formData.get("payerId"),
    amount: formData.get("amount"),
    currency: formData.get("currency") || trip.currency,
    description: formData.get("description"),
    category: formData.get("category") || "misc",
    splitMode: formData.get("splitMode") || "equal",
    participantIds: participants,
    weights: weightsRaw,
  });
  if (!parsed.success) {
    return fail("Check the expense form", parsed.error.flatten().fieldErrors);
  }

  // Verify payer + participants are trip members.
  const memberIds = new Set(trip.members.map((m) => m.userId));
  if (!memberIds.has(parsed.data.payerId)) {
    return fail("Payer must be a trip member");
  }
  if (!parsed.data.participantIds.every((id) => memberIds.has(id))) {
    return fail("Every participant must be a trip member");
  }

  // Convert to trip currency for the canonical amount.
  const conv = await convertAmount(
    parsed.data.amount,
    parsed.data.currency,
    trip.currency,
  );

  const shares = splitExpense({
    amount: conv.amount,
    mode: parsed.data.splitMode as SplitMode,
    participants: parsed.data.participantIds,
    weights: parsed.data.weights,
  });

  const created = await db.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        tripId,
        payerId: parsed.data.payerId,
        amount: conv.amount,
        currency: trip.currency,
        description: parsed.data.description,
        category: parsed.data.category,
        splitMode: parsed.data.splitMode,
      },
    });

    if (shares.length > 0) {
      await tx.expenseShare.createMany({
        data: shares.map((s) => ({
          expenseId: expense.id,
          userId: s.userId,
          shareAmount: s.shareAmount,
        })),
      });
    }

    await tx.userEvent.create({
      data: {
        userId: session.user.id,
        eventType: "expense_added",
        metadata: JSON.stringify({
          tripId,
          expenseId: expense.id,
          amount: conv.amount,
          currency: trip.currency,
        }),
      },
    });

    return expense;
  });

  revalidatePath(`/trips/${tripId}/expenses`);
  revalidatePath(`/trips/${tripId}/budget`);
  return ok({ id: created.id });
}

export async function deleteExpenseAction(expenseId: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  const expense = await db.expense.findUnique({
    where: { id: expenseId },
    select: { tripId: true, trip: { select: { ownerId: true } } },
  });
  if (!expense) return;
  if (expense.trip.ownerId !== session.user.id) return;
  await db.expense.delete({ where: { id: expenseId } });
  revalidatePath(`/trips/${expense.tripId}/expenses`);
  revalidatePath(`/trips/${expense.tripId}/budget`);
}

export async function settleSharesAction(input: {
  tripId: string;
  fromUserId: string;
  toUserId: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthenticated" } as const;

  const trip = await db.trip.findFirst({
    where: {
      id: input.tripId,
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    select: { id: true },
  });
  if (!trip) return { ok: false, error: "Not found" } as const;

  // Mark all unsettled shares from `fromUserId` to expenses paid by `toUserId`
  // as settled. This is the simplest model — full settlement of the pair.
  const result = await db.expenseShare.updateMany({
    where: {
      userId: input.fromUserId,
      settled: false,
      expense: { tripId: input.tripId, payerId: input.toUserId },
    },
    data: { settled: true, settledAt: new Date() },
  });

  revalidatePath(`/trips/${input.tripId}/expenses`);
  return { ok: true, count: result.count } as const;
}
