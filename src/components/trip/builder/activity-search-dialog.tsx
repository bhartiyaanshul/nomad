"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
import { CategoryIcon, categoryLabel } from "@/lib/category";
import { ACTIVITY_CATEGORIES } from "@/lib/validation/trip";
import { addActivityFromSeed } from "@/server/actions/add-activity-from-seed";

type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

function asCategory(c: string): ActivityCategory {
  return (ACTIVITY_CATEGORIES as readonly string[]).includes(c)
    ? (c as ActivityCategory)
    : "sightseeing";
}

interface ActivitySeedShape {
  id: string;
  name: string;
  category: string;
  estimatedCost: number;
  estimatedDurationHours: number;
  description: string;
}

interface ActivitySearchDialogProps {
  trigger: React.ReactNode;
  stopId: string;
  arrivalDay: number;
  departureDay: number;
  defaultCategory?: string;
  currency: string;
}

export function ActivitySearchDialog({
  trigger,
  stopId,
  arrivalDay,
  departureDay,
  defaultCategory,
  currency,
}: ActivitySearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>(defaultCategory ?? "all");
  const [items, setItems] = useState<ActivitySeedShape[] | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      const url = new URL("/api/activities/search", window.location.origin);
      if (q) url.searchParams.set("q", q);
      if (category !== "all") url.searchParams.set("category", category);
      fetch(url, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => setItems(data.items))
        .catch(() => undefined);
    }, 200);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [open, q, category]);

  function add(activity: ActivitySeedShape) {
    startTransition(async () => {
      const result = await addActivityFromSeed({
        stopId,
        day: arrivalDay,
        name: activity.name,
        description: activity.description,
        category: asCategory(activity.category),
        estimatedCost: activity.estimatedCost,
        estimatedDurationHours: activity.estimatedDurationHours,
      });
      if (result.ok) {
        toast.success(`Added "${activity.name}"`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setQ("");
          setItems(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-border/60 border-b px-6 pt-6 pb-4">
          <DialogTitle className="font-display text-xl tracking-tight">
            Suggested activities
          </DialogTitle>
          <DialogDescription>
            Browse a curated set, scoped to days {arrivalDay}–{departureDay}.
            Pick one to add it; you can edit the day or cost afterward.
          </DialogDescription>
        </DialogHeader>

        <div className="border-border/60 flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              autoFocus
              placeholder="Cooking class, sunset, hike…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {ACTIVITY_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {categoryLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-6 py-4">
          {!items ? (
            <ActivitySkeletons />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Sparkles className="text-muted-foreground size-5" />
              <p className="text-muted-foreground text-sm">
                No matches. Try a different category or clear the search.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((a) => (
                <li
                  key={a.id}
                  className="border-border/70 bg-card hover:border-foreground/20 flex flex-col gap-2 rounded-md border p-4 transition"
                >
                  <div className="flex items-start gap-2">
                    <div className="bg-accent text-accent-foreground rounded-md p-1.5">
                      <CategoryIcon category={a.category} className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {a.name}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        {a.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-muted-foreground tabular-nums flex items-center justify-between gap-2 text-xs">
                    <span>
                      {a.estimatedDurationHours}h ·{" "}
                      {a.estimatedCost > 0
                        ? new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency,
                            maximumFractionDigits: 0,
                          }).format(a.estimatedCost)
                        : "Free"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => add(a)}
                    >
                      Add
                    </Button>
                  </div>
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
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActivitySkeletons() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="border-border/70 flex flex-col gap-2 rounded-md border p-4"
        >
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-12" />
          </div>
        </li>
      ))}
    </ul>
  );
}
