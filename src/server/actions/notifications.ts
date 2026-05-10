"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function markNotificationReadAction(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  await db.notification.updateMany({
    where: { id: notificationId, userId: session.user.id },
    data: { read: true },
  });
  revalidatePath("/dashboard");
}

export async function markAllNotificationsReadAction() {
  const session = await auth();
  if (!session?.user?.id) return;
  await db.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/dashboard");
}
