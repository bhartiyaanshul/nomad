"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ArrowRight, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormError } from "@/components/forms/field";
import { Skeleton } from "@/components/ui/skeleton";
import { swapStopAction, undoStopSwapAction } from "@/server/actions/replan";
import { cn } from "@/lib/utils";

interface Alternative {
  rank: number;
  city: string;
  country: string;
  estimated_cost_match: "lower" | "similar" | "higher";
  distance_km_estimate: number;
  personality_match_score: number;
  preserved: string;
  differs: string;
  transport_from_previous: { mode: string; estimated_hours: number };
  summary: string;
}

interface CompromiseSheetProps {
  stopId: string;
  city: string;
  country: string;
  currency: string;
}

const REASONS = [
  "Travel advisory",
  "Weather",
  "Closed / unavailable",
  "Visa or border issue",
  "Personal preference",
];

const COST_LABEL: Record<string, string> = {
  lower: "Lower cost",
  similar: "Similar cost",
  higher: "Higher cost",
};

export function CompromiseSheet({
  stopId,
  city,
  country,
}: CompromiseSheetProps) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"reason" | "loading" | "results">("reason");
  const [reason, setReason] = useState(REASONS[0]);
  const [maxDistance, setMaxDistance] = useState(500);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [lastSwapId, setLastSwapId] = useState<string | null>(null);

  function fetchAlternatives() {
    setStage("loading");
    setError(null);
    fetch("/api/ai/alternatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stopId, reason, maxDistanceKm: maxDistance }),
    })
      .then(async (res) => {
        const data = (await res.json()) as
          | { alternatives: Alternative[] }
          | { error: string; code?: string };
        if (!res.ok || "error" in data) {
          setError(("error" in data && data.error) || "AI request failed");
          setStage("reason");
          return;
        }
        setAlternatives(data.alternatives);
        setStage("results");
      })
      .catch((err) => {
        console.error(err);
        setError("Network error");
        setStage("reason");
      });
  }

  function pick(alt: Alternative) {
    startTransition(async () => {
      const result = await swapStopAction({
        stopId,
        newCity: alt.city,
        newCountry: alt.country,
        reason,
        transportMode: alt.transport_from_previous.mode,
        transportHours: alt.transport_from_previous.estimated_hours,
      });
      if (result.ok) {
        const swapId = result.data.swapId;
        setLastSwapId(swapId);
        toast.success(`Swapped to ${alt.city}`, {
          action: {
            label: "Undo",
            onClick: async () => {
              const u = await undoStopSwapAction(swapId);
              if (u.ok) toast.success("Restored");
              else toast.error(u.error);
            },
          },
        });
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setStage("reason");
          setAlternatives([]);
          setError(null);
        }
      }}
    >
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 text-destructive hover:text-destructive"
        >
          <AlertTriangle className="size-4" />
          Mark compromised
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-display text-xl tracking-tight">
            {stage === "results" ? "Choose an alternative" : "Find a replacement"}
          </SheetTitle>
          <SheetDescription>
            {stage === "results"
              ? `Three alternatives ranked by cost match, distance from ${city}, and personality fit.`
              : `Tell us what's wrong with ${city}, ${country} and we'll search for three replacements that preserve the trip's shape.`}
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-4">
          {stage === "reason" ? (
            <div className="flex flex-col gap-5">
              <Field id="cmp-reason" label="Reason">
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="cmp-reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                id="cmp-distance"
                label="Maximum distance from this stop"
                hint="Kilometres. Smaller keeps the trip's flow; larger opens new regions."
              >
                <Input
                  id="cmp-distance"
                  type="number"
                  min={50}
                  step={50}
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                />
              </Field>

              {error ? <FormError message={error} /> : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={fetchAlternatives} className="gap-2">
                  <Sparkles className="size-4" />
                  Find alternatives
                </Button>
              </div>
            </div>
          ) : null}

          {stage === "loading" ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-44 w-full rounded-md" />
              ))}
            </div>
          ) : null}

          {stage === "results" ? (
            <ul className="flex flex-col gap-4">
              {alternatives.map((alt) => (
                <li
                  key={alt.rank}
                  className={cn(
                    "border-border/70 bg-card flex flex-col gap-3 rounded-md border p-4",
                    alt.rank === 1 && "ring-primary/30 ring-1",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <p className="text-muted-foreground text-xs tracking-wide uppercase">
                        Rank {alt.rank}
                      </p>
                      <p className="font-display text-xl tracking-tight">
                        {alt.city}
                        <span className="text-muted-foreground">
                          , {alt.country}
                        </span>
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-muted-foreground">
                        {COST_LABEL[alt.estimated_cost_match]} ·{" "}
                        {Math.round(alt.distance_km_estimate)} km
                      </p>
                      <p className="text-foreground tabular-nums mt-1">
                        Match {alt.personality_match_score}%
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground text-xs tracking-wide uppercase">
                        Preserved
                      </p>
                      <p className="mt-1 leading-relaxed">{alt.preserved}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs tracking-wide uppercase">
                        Differs
                      </p>
                      <p className="mt-1 leading-relaxed">{alt.differs}</p>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-xs">
                    {alt.transport_from_previous.mode} ·{" "}
                    {alt.transport_from_previous.estimated_hours}h from
                    previous stop
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      disabled={pending}
                      onClick={() => pick(alt)}
                      className="gap-2"
                    >
                      Choose this
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {lastSwapId ? (
          <div className="border-border/60 sticky bottom-0 border-t px-6 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 w-full"
              onClick={() =>
                startTransition(async () => {
                  const u = await undoStopSwapAction(lastSwapId);
                  if (u.ok) {
                    toast.success("Restored");
                    setLastSwapId(null);
                    setOpen(false);
                  } else {
                    toast.error(u.error);
                  }
                })
              }
            >
              <Undo2 className="size-4" />
              Undo last swap
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
