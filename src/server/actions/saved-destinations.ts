"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { savedDestinationSchema } from "@/lib/validation/auth";
import { fail, ok, type ActionResult } from "./result";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthenticated");
  return session.user.id;
}

export async function addSavedDestinationAction(
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = savedDestinationSchema.safeParse({
    city: formData.get("city"),
    country: formData.get("country"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return fail("Check the form", parsed.error.flatten().fieldErrors);
  }

  const created = await db.savedDestination.create({
    data: {
      userId,
      city: parsed.data.city,
      country: parsed.data.country,
      notes: parsed.data.notes ?? null,
    },
  });

  revalidatePath("/settings");
  return ok({ id: created.id });
}

export async function removeSavedDestinationAction(id: string) {
  const userId = await requireUserId();
  await db.savedDestination.deleteMany({ where: { id, userId } });
  revalidatePath("/settings");
}
