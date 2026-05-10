"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addHours, subDays, subHours } from "date-fns";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generate,
  OllamaError,
  OllamaUnavailableError,
} from "@/lib/ai/ollama";
import { TODOS_SYSTEM, renderTodosUser } from "@/lib/ai/prompts/todos";
import { todosJsonSchema, todosSchema } from "@/lib/ai/schemas/todos";
import {
  resolveDefaultTodos,
  type TodoPriority,
} from "@/lib/default-trip-todos";
import { fail, ok, type ActionResult } from "./result";

const PRIORITY_OFFSETS: Record<
  "high" | "normal" | "low",
  Array<{ amount: number; unit: "hours" | "days" }>
> = {
  high: [
    { amount: 7, unit: "days" },
    { amount: 3, unit: "days" },
    { amount: 1, unit: "days" },
    { amount: 2, unit: "hours" },
  ],
  normal: [
    { amount: 3, unit: "days" },
    { amount: 1, unit: "days" },
  ],
  low: [{ amount: 1, unit: "days" }],
};

/**
 * Seed the default trip-prep checklist for a trip. Idempotent — checks
 * existing todo content (case-insensitive) and skips duplicates so re-running
 * for an already-seeded trip is safe. Reminders are auto-scheduled by
 * priority preset.
 */
export async function seedDefaultTodosFor(args: {
  tripId: string;
  ownerId: string;
  isInternational: boolean;
  tripStart: Date;
}): Promise<{ added: number; skipped: number }> {
  const resolved = resolveDefaultTodos({
    tripStart: args.tripStart,
    isInternational: args.isInternational,
  });

  const existing = await db.todo.findMany({
    where: { tripId: args.tripId, userId: args.ownerId },
    select: { content: true },
  });
  const existingSet = new Set(
    existing.map((e) => e.content.trim().toLowerCase()),
  );

  let added = 0;
  let skipped = 0;
  for (const t of resolved) {
    if (existingSet.has(t.content.trim().toLowerCase())) {
      skipped++;
      continue;
    }
    await db.$transaction(async (tx) => {
      const todo = await tx.todo.create({
        data: {
          tripId: args.tripId,
          userId: args.ownerId,
          content: t.content,
          category: t.category,
          dueAt: t.dueAt,
          priority: t.priority,
          aiGenerated: false,
          aiSuggestedReason: t.reason,
        },
      });
      const offsets = PRIORITY_OFFSETS[t.priority as TodoPriority];
      if (offsets.length > 0) {
        await tx.reminder.createMany({
          data: offsets.map((o) => ({
            todoId: todo.id,
            scheduledAt: offsetToDate(t.dueAt, o),
            channel: "in-app",
          })),
        });
      }
    });
    added++;
  }

  return { added, skipped };
}

export async function seedDefaultTodosAction(
  tripId: string,
): Promise<ActionResult<{ added: number; skipped: number }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const trip = await db.trip.findFirst({
    where: { id: tripId, ownerId: session.user.id },
    select: {
      id: true,
      startDate: true,
      stops: { select: { country: true } },
    },
  });
  if (!trip) return fail("Trip not found");

  // Heuristic: if any two stops have different countries, or if there's
  // at least one country and we don't know the user's home country, treat
  // as international. Defaults to international when no stops yet (shows
  // the full set; user deletes what doesn't apply).
  const distinctCountries = new Set(trip.stops.map((s) => s.country));
  const isInternational =
    distinctCountries.size === 0 || distinctCountries.size > 1
      ? true
      : true; // conservatively show all; users can delete domestic-only

  const result = await seedDefaultTodosFor({
    tripId: trip.id,
    ownerId: session.user.id,
    isInternational,
    tripStart: trip.startDate,
  });

  revalidatePath(`/trips/${tripId}/todos`);
  return ok(result);
}

function offsetToDate(
  due: Date,
  offset: { amount: number; unit: "hours" | "days" },
): Date {
  return offset.unit === "hours"
    ? subHours(due, offset.amount)
    : subDays(due, offset.amount);
}

const addSchema = z.object({
  content: z.string().trim().min(1).max(200),
  category: z.string().min(1).max(40).optional(),
  priority: z.enum(["high", "normal", "low"]).default("normal"),
  dueAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date"),
});

export async function addTodoAction(
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
    select: { id: true },
  });
  if (!trip) return fail("Trip not found");

  const parsed = addSchema.safeParse({
    content: formData.get("content"),
    category: formData.get("category") || undefined,
    priority: formData.get("priority") || "normal",
    dueAt: formData.get("dueAt"),
  });
  if (!parsed.success) {
    return fail("Check the highlighted fields", parsed.error.flatten().fieldErrors);
  }

  const due = new Date(parsed.data.dueAt);
  const offsets = PRIORITY_OFFSETS[parsed.data.priority];

  const created = await db.$transaction(async (tx) => {
    const todo = await tx.todo.create({
      data: {
        tripId,
        userId: session.user.id,
        content: parsed.data.content,
        category: parsed.data.category ?? null,
        dueAt: due,
        priority: parsed.data.priority,
        aiGenerated: false,
      },
    });
    if (offsets.length > 0) {
      await tx.reminder.createMany({
        data: offsets.map((o) => ({
          todoId: todo.id,
          scheduledAt: offsetToDate(due, o),
          channel: "in-app",
        })),
      });
    }
    return todo;
  });

  revalidatePath(`/trips/${tripId}/todos`);
  return ok({ id: created.id });
}

export async function toggleTodoStatusAction(todoId: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  const todo = await db.todo.findUnique({
    where: { id: todoId },
    select: { id: true, status: true, tripId: true, userId: true },
  });
  if (!todo || todo.userId !== session.user.id) return;
  await db.todo.update({
    where: { id: todoId },
    data: { status: todo.status === "done" ? "pending" : "done" },
  });
  revalidatePath(`/trips/${todo.tripId}/todos`);
}

export async function deleteTodoAction(todoId: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  const todo = await db.todo.findUnique({
    where: { id: todoId },
    select: { id: true, tripId: true, userId: true },
  });
  if (!todo || todo.userId !== session.user.id) return;
  await db.todo.delete({ where: { id: todoId } });
  revalidatePath(`/trips/${todo.tripId}/todos`);
}

export interface SuggestedTodo {
  content: string;
  category: string;
  priority: "high" | "normal" | "low";
  days_before_trip: number;
  reason: string;
  reminder_offsets: Array<{ amount: number; unit: "hours" | "days" }>;
}

export async function suggestTodosAction(
  tripId: string,
): Promise<ActionResult<{ todos: SuggestedTodo[] }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const trip = await db.trip.findFirst({
    where: { id: tripId, ownerId: session.user.id },
    select: {
      id: true,
      personality: true,
      startDate: true,
      endDate: true,
      members: { select: { id: true } },
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

  const destinations = trip.stops.map((s) => `${s.city}, ${s.country}`);
  const countries = new Set(trip.stops.map((s) => s.country));
  const owner = await db.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  // Best-effort guess of origin country: not a stored field. Default to a
  // generic "your home country"; the AI handles missing info gracefully.
  const originCountry = "your home country";
  const isInternational = countries.size > 0 && !countries.has(originCountry);
  void owner; // language is currently unused; kept for future i18n

  const days = Math.ceil(
    (trip.endDate.getTime() - trip.startDate.getTime()) /
      (24 * 60 * 60 * 1000),
  );

  const userPrompt = renderTodosUser({
    originCountry,
    destinations,
    tripStartDate: trip.startDate.toISOString().slice(0, 10),
    tripEndDate: trip.endDate.toISOString().slice(0, 10),
    days: Math.max(1, days),
    isInternational,
    personality: trip.personality ?? "mixed",
    activityCategories: Array.from(
      new Set(trip.stops.flatMap((s) => s.activities.map((a) => a.category))),
    ),
    groupSize: trip.members.length,
  });

  try {
    const result = await generate({
      system: TODOS_SYSTEM,
      user: userPrompt,
      schema: todosJsonSchema,
      temperature: 0.3,
      validate: (raw) => todosSchema.parse(raw),
    });
    return ok({ todos: result.todos as SuggestedTodo[] });
  } catch (err) {
    if (err instanceof OllamaUnavailableError) return fail(err.message);
    if (err instanceof OllamaError) return fail(err.message);
    console.error("[suggestTodos] error", err);
    return fail("Could not generate todos");
  }
}

export async function applySuggestedTodoAction(input: {
  tripId: string;
  todo: SuggestedTodo;
}): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const trip = await db.trip.findFirst({
    where: { id: input.tripId, ownerId: session.user.id },
    select: { startDate: true },
  });
  if (!trip) return fail("Trip not found");

  const due = subDays(trip.startDate, input.todo.days_before_trip);

  const offsets =
    input.todo.reminder_offsets.length > 0
      ? input.todo.reminder_offsets
      : PRIORITY_OFFSETS[input.todo.priority];

  const created = await db.$transaction(async (tx) => {
    const todo = await tx.todo.create({
      data: {
        tripId: input.tripId,
        userId: session.user.id,
        content: input.todo.content,
        category: input.todo.category,
        dueAt: due,
        priority: input.todo.priority,
        aiGenerated: true,
        aiSuggestedReason: input.todo.reason,
      },
    });
    await tx.reminder.createMany({
      data: offsets.map((o) => ({
        todoId: todo.id,
        scheduledAt: offsetToDate(due, o),
        channel: "in-app",
      })),
    });
    return todo;
  });

  revalidatePath(`/trips/${input.tripId}/todos`);
  return ok({ id: created.id });
}

/** Dev-only — backdate every reminder for a trip so the cron sweeper fires. */
export async function backdateRemindersAction(tripId: string) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false } as const;
  if (process.env.NODE_ENV === "production") return { ok: false } as const;

  await db.reminder.updateMany({
    where: {
      todo: { tripId, userId: session.user.id },
      sent: false,
    },
    data: { scheduledAt: addHours(new Date(), -1) },
  });
  revalidatePath(`/trips/${tripId}/todos`);
  return { ok: true } as const;
}
