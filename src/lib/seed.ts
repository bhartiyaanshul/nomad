// Server-side loader for the static seed JSON files. Cached in the module
// scope after first read so we don't re-parse on every search request.

import { promises as fs } from "node:fs";
import path from "node:path";

export interface SeedCity {
  name: string;
  country: string;
  lat: number;
  lng: number;
  region: string;
  costIndex: number;
  population: number;
}

export interface SeedActivity {
  id: string;
  name: string;
  category: string;
  estimatedCost: number;
  estimatedDurationHours: number;
  description: string;
}

let citiesCache: SeedCity[] | null = null;
let activitiesCache: SeedActivity[] | null = null;

export async function loadCities(): Promise<SeedCity[]> {
  if (citiesCache) return citiesCache;
  const file = path.join(process.cwd(), "public", "seed", "cities.json");
  const raw = await fs.readFile(file, "utf8");
  const parsed = JSON.parse(raw) as SeedCity[];
  citiesCache = parsed;
  return parsed;
}

export async function loadActivities(): Promise<SeedActivity[]> {
  if (activitiesCache) return activitiesCache;
  const file = path.join(process.cwd(), "public", "seed", "activities.json");
  const raw = await fs.readFile(file, "utf8");
  const parsed = JSON.parse(raw) as SeedActivity[];
  activitiesCache = parsed;
  return parsed;
}
