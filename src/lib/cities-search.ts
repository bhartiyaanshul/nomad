// Worldwide city search via Nominatim. Module-scoped LRU cache so repeated
// queries don't re-hit the upstream. Rate-limited (1 req/sec) by the same
// queue used elsewhere — safe for low-volume / single-instance usage.

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = process.env.NOMINATIM_USER_AGENT ?? "Traveloop/1.0";
const REQUEST_GAP_MS = 1_100;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;

export interface CityHit {
  name: string;
  country: string;
  region: string | null;
  lat: number;
  lng: number;
}

interface CacheEntry {
  results: CityHit[];
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

function lruGet(key: string): CityHit[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  // Refresh recency by re-inserting.
  cache.delete(key);
  cache.set(key, hit);
  return hit.results;
}

function lruSet(key: string, results: CityHit[]): void {
  cache.set(key, { results, fetchedAt: Date.now() });
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  state?: string;
  region?: string;
  province?: string;
  county?: string;
  country?: string;
}

interface NominatimItem {
  display_name?: string;
  lat?: string;
  lon?: string;
  class?: string;
  type?: string;
  importance?: number;
  address?: NominatimAddress;
}

function pickPlaceName(addr: NominatimAddress): string | null {
  return (
    addr.city ??
    addr.town ??
    addr.village ??
    addr.municipality ??
    addr.hamlet ??
    null
  );
}

function pickRegion(addr: NominatimAddress): string | null {
  return addr.state ?? addr.region ?? addr.province ?? addr.county ?? null;
}

async function fetchNominatim(query: string, limit: number): Promise<CityHit[]> {
  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(Math.max(1, Math.min(limit * 3, 30))));
  url.searchParams.set("featuretype", "city");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8_000);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    console.warn("[cities-search] Nominatim fetch failed", err);
    return [];
  }
  clearTimeout(timer);
  if (!res.ok) {
    console.warn(`[cities-search] Nominatim ${res.status}`);
    return [];
  }
  const data = (await res.json()) as NominatimItem[];

  // Keep only entries that have a usable place name + country, and dedupe
  // on (name | country | region).
  const seen = new Set<string>();
  const hits: CityHit[] = [];
  for (const item of data) {
    const addr = item.address ?? {};
    const name = pickPlaceName(addr);
    const country = addr.country;
    if (!name || !country) continue;
    const region = pickRegion(addr);
    const key = `${name.toLowerCase()}|${country.toLowerCase()}|${(region ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    hits.push({ name, country, region, lat, lng });
    if (hits.length >= limit) break;
  }
  return hits;
}

/**
 * Search cities worldwide. Returns up to `limit` hits. Hits are uniquely
 * identified by (name, country, region) so the same-named city in different
 * countries / regions surfaces as separate options.
 */
export async function searchCitiesWorldwide(
  query: string,
  limit = 8,
): Promise<CityHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const cacheKey = `${q.toLowerCase()}|${limit}`;
  const cached = lruGet(cacheKey);
  if (cached) return cached;

  // Rate-limited queue (Nominatim asks for ≤1 req/sec).
  const ticket = queue.then(async () => {
    const wait = Math.max(0, REQUEST_GAP_MS - (Date.now() - lastRequestAt));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return fetchNominatim(q, limit);
  });
  queue = ticket.catch(() => undefined);
  const results = await ticket;

  lruSet(cacheKey, results);
  return results;
}
