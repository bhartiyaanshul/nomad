import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { searchCitiesWorldwide, type CityHit } from "@/lib/cities-search";
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
  const worldwide = url.searchParams.get("worldwide") === "1";

  // Worldwide mode: light shape (name, country, region, lat, lng) backed by
  // Nominatim with the local seed as a fallback. Used by the combobox.
  if (worldwide) return worldwideSearch(url);

  // Default: filtered seed search with the SeedCity shape (population,
  // costIndex, region). Used by the "Browse all cities" dialog.
  return seedSearch(url);
}

async function worldwideSearch(url: URL) {
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(
    20,
    Math.max(1, Number(url.searchParams.get("limit") ?? 6)),
  );

  // Empty query → return a short list of popular seed cities so the
  // dropdown isn't blank when the input is first focused.
  if (q.length < 2) {
    const seed = await loadCities();
    return NextResponse.json({
      items: seed.slice(0, limit).map((c) => ({
        name: c.name,
        country: c.country,
        region: null,
        lat: c.lat,
        lng: c.lng,
      })),
      source: "seed",
    });
  }

  let items: CityHit[] = [];
  try {
    items = await searchCitiesWorldwide(q, limit);
  } catch (err) {
    console.warn("[api/cities/search] worldwide search failed", err);
  }

  // Supplement with seed matches when the upstream returned fewer than
  // `limit` so the dropdown is never empty due to network hiccups.
  if (items.length < limit) {
    const seed = await loadCities();
    const lower = q.toLowerCase();
    const seedHits: CityHit[] = seed
      .filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.country.toLowerCase().includes(lower),
      )
      .map((c) => ({
        name: c.name,
        country: c.country,
        region: null,
        lat: c.lat,
        lng: c.lng,
      }));
    const existing = new Set(
      items.map((h) => `${h.name.toLowerCase()}|${h.country.toLowerCase()}`),
    );
    for (const h of seedHits) {
      const k = `${h.name.toLowerCase()}|${h.country.toLowerCase()}`;
      if (existing.has(k)) continue;
      existing.add(k);
      items.push(h);
      if (items.length >= limit) break;
    }
  }

  return NextResponse.json({ items: items.slice(0, limit), source: "worldwide" });
}

async function seedSearch(url: URL) {
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const country = (url.searchParams.get("country") ?? "").trim().toLowerCase();
  const region = (url.searchParams.get("region") ?? "").trim();
  const tier = (url.searchParams.get("tier") ?? "").trim();
  const limit = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get("limit") ?? 20)),
  );

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
