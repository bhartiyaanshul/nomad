import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const items = await db.notification.findMany({
    where: { userId: session.user.id, read: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ items, count: items.length });
}
