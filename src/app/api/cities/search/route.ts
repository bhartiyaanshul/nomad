import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { loadCities, type SeedCity } from "@/lib/seed";

export const runtime = "nodejs";

const COST_TIERS: Record<string, (c: SeedCity) => boolean> = {
  low: (c) => c.costIndex <= 4,
  mid: (c) => c.costIndex >= 5 && c.costIndex <= 7,
  high: (c) => c.costIndex >= 8,
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const country = (url.searchParams.get("country") ?? "").trim().toLowerCase();
  const region = (url.searchParams.get("region") ?? "").trim();
  const tier = (url.searchParams.get("tier") ?? "").trim();
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));

  const cities = await loadCities();
  const tierFilter = COST_TIERS[tier];

  let results = cities.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q) && !c.country.toLowerCase().includes(q)) {
      return false;
    }
    if (country && !c.country.toLowerCase().includes(country)) return false;
    if (region && c.region !== region) return false;
    if (tierFilter && !tierFilter(c)) return false;
    return true;
  });

  // Rank: exact name prefix match first, then longer-population first.
  if (q) {
    results = results.sort((a, b) => {
      const aPrefix = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bPrefix = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      return b.population - a.population;
    });
  } else {
    results = results.sort((a, b) => b.population - a.population);
  }

  return NextResponse.json({
    items: results.slice(0, limit),
    total: results.length,
  });
}
