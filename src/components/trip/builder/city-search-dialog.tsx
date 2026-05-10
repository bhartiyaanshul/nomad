"use client";

import { useState, useEffect, useTransition } from "react";
import { Globe, Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CitySeedShape {
  name: string;
  country: string;
  lat: number;
  lng: number;
  region: string;
  costIndex: number;
  population: number;
}

interface CitySearchDialogProps {
  trigger: React.ReactNode;
  onPick: (city: CitySeedShape) => void;
}

const REGIONS = [
  { value: "all", label: "All regions" },
  { value: "asia", label: "Asia" },
  { value: "middle_east", label: "Middle East" },
  { value: "europe", label: "Europe" },
  { value: "africa", label: "Africa" },
  { value: "north_america", label: "North America" },
  { value: "south_america", label: "South America" },
  { value: "oceania", label: "Oceania" },
];

const TIERS = [
  { value: "all", label: "Any cost tier" },
  { value: "low", label: "Low cost" },
  { value: "mid", label: "Mid cost" },
  { value: "high", label: "High cost" },
];

const TIER_LABEL: Record<number, string> = {
  1: "Very low",
  2: "Low",
  3: "Low",
  4: "Low-mid",
  5: "Mid",
  6: "Mid",
  7: "Mid-high",
  8: "High",
  9: "High",
  10: "Very high",
};

export function CitySearchDialog({ trigger, onPick }: CitySearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("all");
  const [tier, setTier] = useState("all");
  const [items, setItems] = useState<CitySeedShape[] | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      const url = new URL("/api/cities/search", window.location.origin);
      if (q) url.searchParams.set("q", q);
      if (region !== "all") url.searchParams.set("region", region);
      if (tier !== "all") url.searchParams.set("tier", tier);
      startTransition(async () => {
        try {
          const res = await fetch(url, { signal: controller.signal });
          const data = (await res.json()) as { items: CitySeedShape[] };
          setItems(data.items);
        } catch {
          // request superseded — ignore
        }
      });
    }, 200);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [open, q, region, tier]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setQ("");
          setRegion("all");
          setTier("all");
          setItems(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-border/60 border-b px-6 pt-6 pb-4">
          <DialogTitle className="font-display text-xl tracking-tight">
            Find a city
          </DialogTitle>
          <DialogDescription>
            Search by name or country. Pre-seeded with 100+ cities so it
            works offline.
          </DialogDescription>
        </DialogHeader>

        <div className="border-border/60 flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              autoFocus
              placeholder="Lisbon, Hanoi, Buenos Aires…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIERS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-2 py-2">
          {!items ? (
            <CitySkeletons />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Globe className="text-muted-foreground size-5" />
              <p className="text-muted-foreground text-sm">
                No cities match. Try a different region or remove the cost
                filter.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {items.map((c) => (
                <li key={`${c.name}-${c.country}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(c);
                      setOpen(false);
                    }}
                    className={cn(
                      "hover:bg-accent/60 flex w-full items-baseline justify-between gap-3 rounded-md px-4 py-3 text-left transition",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {c.name}
                        <span className="text-muted-foreground"> · {c.country}</span>
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs capitalize">
                        {c.region.replace(/_/g, " ")} ·{" "}
                        {TIER_LABEL[c.costIndex] ?? "Mid"} cost
                      </p>
                    </div>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {Intl.NumberFormat("en-US", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(c.population)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-border/60 flex items-center justify-end gap-2 border-t px-6 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CitySkeletons() {
  return (
    <ul className="flex flex-col gap-1 px-2 py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-center justify-between px-2 py-3">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3 w-10" />
        </li>
      ))}
    </ul>
  );
}
