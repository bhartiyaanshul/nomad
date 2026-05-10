"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MAX_RESULTS = 6;
const SEARCH_DEBOUNCE_MS = 250;

// ─── Country data (loaded once, cached) ──────────────────────────────
let cachedCountries: string[] | null = null;
async function loadCountries(): Promise<string[]> {
  if (cachedCountries) return cachedCountries;
  try {
    const res = await fetch("/seed/countries.json", { cache: "force-cache" });
    if (!res.ok) return [];
    const data = (await res.json()) as string[];
    cachedCountries = data;
    return data;
  } catch {
    return [];
  }
}

interface CityHit {
  name: string;
  country: string;
  region: string | null;
}

// ─── CityCombobox ────────────────────────────────────────────────────
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
 * City input with a popover-style dropdown backed by a worldwide search
 * (Nominatim, server-side, with LRU cache). Each row shows
 * `City · Region · Country`, so the same city name in different countries
 * (e.g., Naples in Italy and the US) surfaces as separate options.
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
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CityHit[]>([]);
  const [loading, setLoading] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);

  useOutsideClick(wrap, () => setOpen(false));

  // Debounced fetch as the user types.
  useEffect(() => {
    if (!open) return;
    const seq = ++seqRef.current;
    const t = setTimeout(() => {
      const url = new URL("/api/cities/search", window.location.origin);
      url.searchParams.set("worldwide", "1");
      url.searchParams.set("limit", String(MAX_RESULTS));
      if (value.trim()) url.searchParams.set("q", value.trim());
      setLoading(true);
      fetch(url, { signal: AbortSignal.timeout(8_000) })
        .then((r) => r.json())
        .then((data: { items?: CityHit[] }) => {
          if (seq !== seqRef.current) return; // superseded
          setResults(data.items ?? []);
        })
        .catch(() => {
          if (seq !== seqRef.current) return;
          setResults([]);
        })
        .finally(() => {
          if (seq !== seqRef.current) return;
          setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value, open]);

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
      {loading ? (
        <Loader2 className="text-muted-foreground absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin" />
      ) : null}
      <Dropdown open={open && (results.length > 0 || loading)} ariaLabel="Matching cities">
        {loading && results.length === 0 ? (
          <li className="text-muted-foreground px-3 py-2 text-xs">
            Searching worldwide…
          </li>
        ) : null}
        {results.map((c) => (
          <DropdownButton
            key={`${c.name}|${c.country}|${c.region ?? ""}`}
            onSelect={() => {
              onValueChange(c.name);
              onCityPicked?.({ city: c.name, country: c.country });
              setOpen(false);
            }}
          >
            <MapPin className="text-muted-foreground size-3.5 shrink-0" />
            <span className="text-foreground truncate font-medium">
              {c.name}
            </span>
            <span className="text-muted-foreground ml-auto truncate text-xs">
              {c.region ? `${c.region} · ` : ""}
              {c.country}
            </span>
          </DropdownButton>
        ))}
      </Dropdown>
    </div>
  );
}

// ─── CountryCombobox ─────────────────────────────────────────────────
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
    loadCountries().then(setCountries);
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
            <MapPin className="text-muted-foreground size-3.5 shrink-0" />
            <span className="text-foreground">{c}</span>
          </DropdownButton>
        ))}
      </Dropdown>
    </div>
  );
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

// ─── Shared UI primitives ────────────────────────────────────────────
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
        "border-border bg-popover absolute top-full right-0 left-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-md border shadow-md",
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
        // mousedown preventDefault so the input doesn't blur before click.
        onMouseDown={(e) => e.preventDefault()}
        onClick={onSelect}
        className="hover:bg-accent focus:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition outline-none"
      >
        {children}
      </button>
    </li>
  );
});
