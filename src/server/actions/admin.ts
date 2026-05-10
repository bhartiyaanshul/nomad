"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("Forbidden");
  return session.user;
}

export async function toggleAdminAction(userId: string, makeAdmin: boolean) {
  const me = await requireAdmin();
  if (userId === me.id) return; // can't demote yourself
  await db.user.update({
    where: { id: userId },
    data: { isAdmin: makeAdmin },
  });
  revalidatePath("/admin");
}

export async function toggleBanAction(userId: string, banned: boolean) {
  const me = await requireAdmin();
  if (userId === me.id) return;
  await db.user.update({
    where: { id: userId },
    data: { banned },
  });
  revalidatePath("/admin");
}
