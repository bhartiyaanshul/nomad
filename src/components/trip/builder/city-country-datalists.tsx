"use client";

import { useEffect, useState } from "react";

interface SeedCity {
  name: string;
  country: string;
}

let cachedCities: SeedCity[] | null = null;

async function loadCities(): Promise<SeedCity[]> {
  if (cachedCities) return cachedCities;
  try {
    const res = await fetch("/seed/cities.json", { cache: "force-cache" });
    if (!res.ok) return [];
    const data = (await res.json()) as SeedCity[];
    cachedCities = data;
    return data;
  } catch {
    return [];
  }
}

interface CityCountryDatalistsProps {
  cityListId: string;
  countryListId: string;
}

/**
 * Renders two <datalist> elements populated from the cities seed JSON.
 * Reference them from <Input list={cityListId}> / <Input list={countryListId}>
 * to get native browser autocomplete that filters as the user types.
 */
export function CityCountryDatalists({
  cityListId,
  countryListId,
}: CityCountryDatalistsProps) {
  const [cities, setCities] = useState<SeedCity[]>([]);

  useEffect(() => {
    loadCities().then(setCities);
  }, []);

  // Dedup countries; keep cities ordered by frequency (input order is roughly
  // population-ranked already in the seed).
  const countries = Array.from(new Set(cities.map((c) => c.country))).sort();

  return (
    <>
      <datalist id={cityListId}>
        {cities.map((c) => (
          <option key={`${c.name}|${c.country}`} value={c.name}>
            {c.country}
          </option>
        ))}
      </datalist>
      <datalist id={countryListId}>
        {countries.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  );
}
