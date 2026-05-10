"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SeedCity {
  name: string;
  country: string;
}

const MAX_RESULTS = 6;

let cachedCities: SeedCity[] | null = null;
let cachedCountries: string[] | null = null;

async function loadCities(): Promise<SeedCity[]> {
  if (cachedCities) return cachedCities;
  try {
    const res = await fetch("/seed/cities.json", { cache: "force-cache" });
    if (!res.ok) return [];
    const data = (await res.json()) as SeedCity[];
    cachedCities = data;
    cachedCountries = Array.from(new Set(data.map((c) => c.country))).sort();
    return data;
  } catch {
    return [];
  }
}

interface CityComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  onCityPicked?: (picked: { city: string; country: string }) => void;
  id: string;
  name?: string;
  required?: boolean;
  placeholder?: string;
}

/**
 * City input with a popover-style dropdown that filters from
 * public/seed/cities.json. Each row shows "City · Country" so the same
 * city name in different countries (e.g., Naples) is disambiguated.
 * Selecting a row fires onCityPicked with both the city name and the
 * country, so the parent can update the country input alongside.
 */
export function CityCombobox({
  value,
  onValueChange,
  onCityPicked,
  id,
  name = "city",
  required,
  placeholder = "Hanoi",
}: CityComboboxProps) {
  const [cities, setCities] = useState<SeedCity[]>([]);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCities().then(setCities);
  }, []);
  useOutsideClick(wrap, () => setOpen(false));

  const matches = filterCities(cities, value, MAX_RESULTS);

  return (
    <div className="relative" ref={wrap}>
      <Input
        id={id}
        name={name}
        required={required}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <Dropdown open={open && matches.length > 0} ariaLabel="Matching cities">
        {matches.map((c) => (
          <DropdownButton
            key={`${c.name}|${c.country}`}
            onSelect={() => {
              onValueChange(c.name);
              onCityPicked?.({ city: c.name, country: c.country });
              setOpen(false);
            }}
          >
            <MapPin className="text-muted-foreground size-3.5" />
            <span className="text-foreground font-medium">{c.name}</span>
            <span className="text-muted-foreground ml-auto text-xs">
              {c.country}
            </span>
          </DropdownButton>
        ))}
      </Dropdown>
    </div>
  );
}

interface CountryComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  id: string;
  name?: string;
  required?: boolean;
  placeholder?: string;
}

export function CountryCombobox({
  value,
  onValueChange,
  id,
  name = "country",
  required,
  placeholder = "Vietnam",
}: CountryComboboxProps) {
  const [countries, setCountries] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCities().then(() => setCountries(cachedCountries ?? []));
  }, []);
  useOutsideClick(wrap, () => setOpen(false));

  const matches = filterCountries(countries, value, MAX_RESULTS);

  return (
    <div className="relative" ref={wrap}>
      <Input
        id={id}
        name={name}
        required={required}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <Dropdown
        open={open && matches.length > 0}
        ariaLabel="Matching countries"
      >
        {matches.map((c) => (
          <DropdownButton
            key={c}
            onSelect={() => {
              onValueChange(c);
              setOpen(false);
            }}
          >
            <MapPin className="text-muted-foreground size-3.5" />
            <span className="text-foreground">{c}</span>
          </DropdownButton>
        ))}
      </Dropdown>
    </div>
  );
}

function filterCities(
  cities: SeedCity[],
  query: string,
  limit: number,
): SeedCity[] {
  const q = query.trim().toLowerCase();
  if (!q) return cities.slice(0, limit);
  const prefix: SeedCity[] = [];
  const rest: SeedCity[] = [];
  for (const c of cities) {
    const nameLower = c.name.toLowerCase();
    if (nameLower.startsWith(q)) prefix.push(c);
    else if (nameLower.includes(q) || c.country.toLowerCase().includes(q)) {
      rest.push(c);
    }
  }
  return [...prefix, ...rest].slice(0, limit);
}

function filterCountries(
  countries: string[],
  query: string,
  limit: number,
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return countries.slice(0, limit);
  const prefix: string[] = [];
  const rest: string[] = [];
  for (const c of countries) {
    const lower = c.toLowerCase();
    if (lower.startsWith(q)) prefix.push(c);
    else if (lower.includes(q)) rest.push(c);
  }
  return [...prefix, ...rest].slice(0, limit);
}

function useOutsideClick(
  ref: React.RefObject<HTMLElement | null>,
  onOutside: () => void,
) {
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onOutside]);
}

function Dropdown({
  open,
  ariaLabel,
  children,
}: {
  open: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <ul
      role="listbox"
      aria-label={ariaLabel}
      className={cn(
        "border-border bg-popover absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-md border shadow-md",
      )}
    >
      {children}
    </ul>
  );
}

const DropdownButton = forwardRef<
  HTMLButtonElement,
  {
    onSelect: () => void;
    children: React.ReactNode;
  }
>(function DropdownButton({ onSelect, children }, ref) {
  return (
    <li>
      <button
        ref={ref}
        type="button"
        role="option"
        aria-selected={false}
        // preventDefault on mousedown so the input doesn't blur before the
        // click registers.
        onMouseDown={(e) => e.preventDefault()}
        onClick={onSelect}
        className="hover:bg-accent focus:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition outline-none"
      >
        {children}
      </button>
    </li>
  );
});
