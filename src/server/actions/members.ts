"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, ok, type ActionResult } from "./result";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["co-planner", "traveler"]).default("traveler"),
});

export async function inviteMemberAction(
  tripId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ status: "added" | "pending" }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { id: true, ownerId: true },
  });
  if (!trip || trip.ownerId !== session.user.id) {
    return fail("Trip not found");
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role") || "traveler",
  });
  if (!parsed.success) {
    return fail("Enter a valid email", parsed.error.flatten().fieldErrors);
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (!user) {
    return fail(
      "No Traveloop account with that email yet. Ask them to sign up first.",
      { email: ["No account found"] },
    );
  }

  // Self-invite check
  if (user.id === session.user.id) {
    return fail("You're already on this trip", { email: ["You're the owner"] });
  }

  const existing = await db.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: user.id } },
  });
  if (existing) {
    return fail("That person is already a member", {
      email: ["Already on this trip"],
    });
  }

  await db.tripMember.create({
    data: {
      tripId,
      userId: user.id,
      role: parsed.data.role,
      status: "active",
    },
  });

  revalidatePath(`/trips/${tripId}/expenses`);
  return ok({ status: "added" });
}

export async function removeMemberAction(memberId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  const member = await db.tripMember.findUnique({
    where: { id: memberId },
    select: { tripId: true, role: true, trip: { select: { ownerId: true } } },
  });
  if (!member || member.trip.ownerId !== session.user.id) return;
  if (member.role === "owner") return; // can't remove the owner

  await db.tripMember.delete({ where: { id: memberId } });
  revalidatePath(`/trips/${member.tripId}/expenses`);
}

const roleSchema = z.enum(["owner", "co-planner", "traveler"]);

export async function updateMemberRoleAction(
  memberId: string,
  role: string,
) {
  const session = await auth();
  if (!session?.user?.id) return;

  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) return;

  const member = await db.tripMember.findUnique({
    where: { id: memberId },
    select: {
      tripId: true,
      role: true,
      trip: { select: { ownerId: true } },
    },
  });
  if (!member || member.trip.ownerId !== session.user.id) return;
  if (member.role === "owner" || parsed.data === "owner") return;

  await db.tripMember.update({
    where: { id: memberId },
    data: { role: parsed.data },
  });
  revalidatePath(`/trips/${member.tripId}/expenses`);
}
