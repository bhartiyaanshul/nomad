import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { loadActivities } from "@/lib/seed";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const category = (url.searchParams.get("category") ?? "").trim();
  const maxCost = Number(url.searchParams.get("maxCost") ?? "0");
  const maxDuration = Number(url.searchParams.get("maxDuration") ?? "0");
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 30)));

  const activities = await loadActivities();

  const results = activities.filter((a) => {
    if (q && !a.name.toLowerCase().includes(q) && !a.description.toLowerCase().includes(q)) {
      return false;
    }
    if (category && a.category !== category) return false;
    if (maxCost > 0 && a.estimatedCost > maxCost) return false;
    if (maxDuration > 0 && a.estimatedDurationHours > maxDuration) return false;
    return true;
  });

  return NextResponse.json({
    items: results.slice(0, limit),
    total: results.length,
  });
}
