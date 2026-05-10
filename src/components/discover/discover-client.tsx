"use client";

import { useState } from "react";
import { Compass, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
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
import { Field } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PinpointCluster } from "@/lib/ai/schemas/pinpoints";

interface DiscoverClientProps {
  defaultPersonality: string;
}

const PERSONALITIES = [
  { value: "foodie", label: "Foodie" },
  { value: "adventurer", label: "Adventurer" },
  { value: "culture", label: "Culture" },
  { value: "chill", label: "Chill" },
  { value: "social", label: "Social" },
  { value: "budget", label: "Budget" },
  { value: "luxury", label: "Luxury" },
  { value: "mixed", label: "Mixed" },
];

export function DiscoverClient({ defaultPersonality }: DiscoverClientProps) {
  const [region, setRegion] = useState("");
  const [personality, setPersonality] = useState(defaultPersonality);
  const [pace, setPace] = useState<"fast" | "balanced" | "slow">("balanced");
  const [n, setN] = useState(12);
  const [pending, setPending] = useState(false);
  const [clusters, setClusters] = useState<PinpointCluster[] | null>(null);
  const [resolvedRegion, setResolvedRegion] = useState<string | null>(null);

  function discover() {
    if (!region.trim() || pending) return;
    setPending(true);
    setClusters(null);
    fetch("/api/ai/pinpoints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region, personality, pace, n }),
    })
      .then(async (res) => {
        const data = (await res.json()) as
          | { region: string; clusters: PinpointCluster[] }
          | { error: string };
        if (!res.ok || "error" in data) {
          toast.error(("error" in data && data.error) || "Discovery failed");
          return;
        }
        setClusters(data.clusters);
        setResolvedRegion(data.region);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Network error");
      })
      .finally(() => setPending(false));
  }

  return (
    <div className="flex flex-col gap-8">
      <Card className="border-border/70 shadow-none">
        <CardContent className="grid gap-4 p-6 sm:grid-cols-[1fr_180px_140px_120px_auto] sm:items-end">
          <Field id="discover-region" label="Region or country" required>
            <Input
              id="discover-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Andalusia, Northern Italy, Hokkaido"
              maxLength={120}
            />
          </Field>
          <Field id="discover-personality" label="Personality">
            <Select value={personality} onValueChange={setPersonality}>
              <SelectTrigger id="discover-personality">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERSONALITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="discover-pace" label="Pace">
            <Select
              value={pace}
              onValueChange={(v) => setPace(v as typeof pace)}
            >
              <SelectTrigger id="discover-pace">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">Fast</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="slow">Slow</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field id="discover-n" label="Pinpoints">
            <Input
              id="discover-n"
              type="number"
              min={4}
              max={40}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
            />
          </Field>
          <Button
            type="button"
            onClick={discover}
            disabled={!region.trim() || pending}
            className="gap-2"
          >
            <Sparkles className="size-4" />
            {pending ? "Discovering" : "Discover"}
          </Button>
        </CardContent>
      </Card>

      {pending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-md" />
          ))}
        </div>
      ) : null}

      {clusters && clusters.length > 0 ? (
        <div className="flex flex-col gap-8">
          {resolvedRegion ? (
            <p className="text-muted-foreground text-sm">
              {clusters.length} clusters in{" "}
              <span className="text-foreground font-medium">
                {resolvedRegion}
              </span>
            </p>
          ) : null}
          {clusters
            .sort((a, b) => a.cluster_day - b.cluster_day)
            .map((c) => (
              <section key={c.cluster_day}>
                <header className="border-border/60 mb-4 flex items-baseline justify-between border-b pb-2">
                  <div>
                    <p className="text-muted-foreground text-xs tracking-wide uppercase">
                      Day {c.cluster_day}
                    </p>
                    <h2 className="font-display mt-1 text-xl tracking-tight">
                      {c.cluster_name}
                    </h2>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {c.pinpoints.length}{" "}
                    {c.pinpoints.length === 1 ? "spot" : "spots"}
                  </span>
                </header>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {c.pinpoints.map((p) => (
                    <li
                      key={p.name}
                      className={cn(
                        "border-border/70 bg-card flex flex-col gap-2 rounded-md border p-4",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-muted-foreground mt-0.5 text-xs capitalize">
                            {p.type}
                          </p>
                        </div>
                        {p.is_offbeat ? (
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                          >
                            Offbeat
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {p.why_matches}
                      </p>
                      <p className="text-muted-foreground tabular-nums text-xs">
                        {p.estimated_duration_hours}h ·{" "}
                        {p.estimated_cost > 0
                          ? formatCurrency(p.estimated_cost, "USD")
                          : "Free"}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      ) : !pending ? (
        <div className="border-border/60 flex flex-col items-center gap-2 rounded-md border border-dashed px-6 py-16 text-center">
          <Compass className="text-muted-foreground size-5" />
          <p className="text-muted-foreground text-sm">
            Enter a region above and we&apos;ll suggest places worth your
            time, geographically clustered.
          </p>
        </div>
      ) : null}
    </div>
  );
}
