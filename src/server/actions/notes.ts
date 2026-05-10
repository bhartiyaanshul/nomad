"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, ok, type ActionResult } from "./result";

const noteSchema = z.object({
  title: z.string().trim().max(120).optional().nullable(),
  content: z.string().min(1).max(10_000),
  stopId: z.string().min(1).optional().nullable(),
  day: z.coerce.number().int().min(1).optional().nullable(),
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

export async function addNoteAction(
  tripId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");
  if (!(await requireMember(tripId, session.user.id))) return fail("Not found");

  const parsed = noteSchema.safeParse({
    title: formData.get("title") || null,
    content: formData.get("content"),
    stopId: formData.get("stopId") || null,
    day: formData.get("day") || null,
  });
  if (!parsed.success) {
    return fail("Check the highlighted fields", parsed.error.flatten().fieldErrors);
  }

  const created = await db.note.create({
    data: {
      tripId,
      authorId: session.user.id,
      title: parsed.data.title ?? null,
      content: parsed.data.content,
      stopId:
        parsed.data.stopId && parsed.data.stopId !== "trip"
          ? parsed.data.stopId
          : null,
      day: parsed.data.day ?? null,
    },
  });
  revalidatePath(`/trips/${tripId}/notes`);
  return ok({ id: created.id });
}

export async function updateNoteAction(
  noteId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ updated: true }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const note = await db.note.findUnique({
    where: { id: noteId },
    select: { id: true, authorId: true, tripId: true },
  });
  if (!note || note.authorId !== session.user.id) return fail("Not found");

  const parsed = noteSchema.safeParse({
    title: formData.get("title") || null,
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return fail("Check the form", parsed.error.flatten().fieldErrors);
  }

  await db.note.update({
    where: { id: noteId },
    data: {
      title: parsed.data.title ?? null,
      content: parsed.data.content,
    },
  });
  revalidatePath(`/trips/${note.tripId}/notes`);
  return ok({ updated: true });
}

export async function deleteNoteAction(noteId: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  const note = await db.note.findUnique({
    where: { id: noteId },
    select: { id: true, authorId: true, tripId: true },
  });
  if (!note || note.authorId !== session.user.id) return;
  await db.note.delete({ where: { id: noteId } });
  revalidatePath(`/trips/${note.tripId}/notes`);
}

export async function togglePinNoteAction(noteId: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  const note = await db.note.findUnique({
    where: { id: noteId },
    select: { id: true, authorId: true, tripId: true, pinned: true },
  });
  if (!note || note.authorId !== session.user.id) return;
  await db.note.update({
    where: { id: noteId },
    data: { pinned: !note.pinned },
  });
  revalidatePath(`/trips/${note.tripId}/notes`);
}
