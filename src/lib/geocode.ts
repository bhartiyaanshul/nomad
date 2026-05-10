// Nominatim (OpenStreetMap) geocoder. 1 req/sec rate limit, 30-day DB cache.
// Sequential queue keeps us under their fair-use threshold even when called
// concurrently from one server instance.

import { db } from "@/lib/db";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = process.env.NOMINATIM_USER_AGENT ?? "Traveloop/1.0";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REQUEST_GAP_MS = 1_100;

let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

export class GeocodeError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GeocodeError";
  }
}

function cacheKey(city: string, country: string): string {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;
}

export async function geocodeCity(
  city: string,
  country: string,
): Promise<GeocodeResult | null> {
  const key = cacheKey(city, country);

  // 1. DB cache check
  const cached = await db.geocodeCache.findUnique({ where: { query: key } });
  if (cached) {
    if (Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
      return { latitude: cached.latitude, longitude: cached.longitude };
    }
  }

  // 2. Queue + rate-limit + remote fetch
  const result = await enqueueGeocode(city, country);

  if (result) {
    // Upsert into cache
    await db.geocodeCache.upsert({
      where: { query: key },
      create: {
        query: key,
        latitude: result.latitude,
        longitude: result.longitude,
      },
      update: {
        latitude: result.latitude,
        longitude: result.longitude,
        fetchedAt: new Date(),
      },
    });
  }

  return result;
}

async function enqueueGeocode(
  city: string,
  country: string,
): Promise<GeocodeResult | null> {
  const ticket = queue.then(async () => {
    const wait = Math.max(0, REQUEST_GAP_MS - (Date.now() - lastRequestAt));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return fetchNominatim(city, country);
  });
  queue = ticket.catch(() => undefined);
  return ticket;
}

async function fetchNominatim(
  city: string,
  country: string,
): Promise<GeocodeResult | null> {
  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set("q", `${city}, ${country}`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[geocode] HTTP ${res.status} for ${city}, ${country}`);
      return null;
    }

    const data = (await res.json()) as Array<{
      lat?: string;
      lon?: string;
    }>;
    const top = data[0];
    if (!top?.lat || !top.lon) return null;
    const latitude = Number(top.lat);
    const longitude = Number(top.lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
    return { latitude, longitude };
  } catch (err) {
    console.warn(`[geocode] failed for ${city}, ${country}`, err);
    return null;
  }
}
