"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCheck, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/forms/field";
import { CitySearchDialog } from "@/components/trip/builder/city-search-dialog";
import { cn } from "@/lib/utils";
import {
  castVoteAction,
  finalizeBlendAction,
  proposeCandidateAction,
  removeCandidateAction,
} from "@/server/actions/blend";

interface CandidateShape {
  id: string;
  city: string;
  country: string;
  reason: string | null;
  proposedById: string;
  proposedBy: { name: string; avatarUrl: string | null };
  votes: Array<{ userId: string; weight: number }>;
}

interface MemberShape {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

export interface BlendItineraryVersion {
  versionNumber: number;
  generatedAt: string;
  itinerary: {
    trip_summary: string;
    total_estimated_cost: number;
    currency: string;
    stops: Array<{
      city: string;
      country: string;
      arrival_day: number;
      departure_day: number;
      summary: string;
    }>;
  } | null;
}

interface BlendRoomProps {
  groupId: string;
  tripId: string;
  isOwner: boolean;
  currentUserId: string;
  status: "voting" | "generating" | "finalized";
  votingDeadline: string | null;
  initialCandidates: CandidateShape[];
  members: MemberShape[];
  initialVersion: BlendItineraryVersion | null;
}

export function BlendRoom({
  groupId,
  tripId,
  isOwner,
  currentUserId,
  status,
  votingDeadline,
  initialCandidates,
  members,
  initialVersion,
}: BlendRoomProps) {
  const router = useRouter();
  // Server is the single source of truth — read directly from props.
  // SSE just triggers router.refresh() and Next replays this component
  // with fresh data.
  const candidates = initialCandidates;
  const version = initialVersion;
  const [refreshing, setRefreshing] = useState(false);

  // SSE wire-up. Reconnect on disconnect.
  useEffect(() => {
    if (status !== "voting") return;
    let es: EventSource | null = null;
    let cancelled = false;
    const open = () => {
      if (cancelled) return;
      es = new EventSource(`/api/blend/${groupId}/stream`);
      es.onmessage = () => {
        setRefreshing(true);
        router.refresh();
      };
      es.onerror = () => {
        es?.close();
        if (!cancelled) setTimeout(open, 2_500);
      };
    };
    open();
    return () => {
      cancelled = true;
      es?.close();
    };
  }, [groupId, router, status]);

  // Reset the refreshing indicator whenever the server data changes.
  // Derived-from-prop check (avoids set-state-in-effect lint).
  const [lastVersionId, setLastVersionId] = useState(
    version?.versionNumber ?? -1,
  );
  const incomingVersionId = version?.versionNumber ?? -1;
  if (incomingVersionId !== lastVersionId) {
    setLastVersionId(incomingVersionId);
    setRefreshing(false);
  }

  const ranked = [...candidates].sort((a, b) => weight(b) - weight(a));
  const closed = status !== "voting";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="border-border/70 shadow-none">
        <CardContent className="p-6">
          <header className="mb-5 flex items-baseline justify-between gap-3">
            <div>
              <h2 className="font-display text-lg tracking-tight">
                Live itinerary
              </h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Re-generates 5 seconds after each new vote or proposal.
                {refreshing ? " Updating…" : ""}
              </p>
            </div>
            {version ? (
              <Badge variant="outline" className="text-[10px] tabular-nums">
                v{version.versionNumber}
              </Badge>
            ) : null}
          </header>

          {!version || !version.itinerary ? (
            <div className="border-border/60 flex flex-col items-center gap-2 rounded-md border border-dashed px-6 py-12 text-center">
              <Sparkles className="text-muted-foreground size-5" />
              <p className="text-muted-foreground text-sm">
                Add a few candidates and cast votes; an itinerary will generate
                automatically.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <p className="text-muted-foreground text-sm leading-relaxed">
                {version.itinerary.trip_summary}
              </p>
              <ul className="flex flex-col gap-3">
                {version.itinerary.stops.map((s, i) => (
                  <li
                    key={`${s.city}-${i}`}
                    className="border-border/70 bg-card flex flex-col gap-1 rounded-md border p-4"
                  >
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-medium">
                        {s.city}
                        <span className="text-muted-foreground">
                          , {s.country}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        Day {s.arrival_day}
                        {s.departure_day > s.arrival_day
                          ? `–${s.departure_day}`
                          : ""}
                      </p>
                    </div>
                    {s.summary ? (
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {s.summary}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-xs">
                Total estimated cost{" "}
                <span className="text-foreground tabular-nums font-medium">
                  {Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: version.itinerary.currency,
                    maximumFractionDigits: 0,
                  }).format(version.itinerary.total_estimated_cost)}
                </span>
              </p>
            </div>
          )}

          {isOwner && !closed ? (
            <div className="border-border/60 mt-6 flex flex-col items-start gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-muted-foreground text-xs">
                {votingDeadline ? (
                  <>
                    Voting ends{" "}
                    {new Date(votingDeadline).toLocaleString()}
                  </>
                ) : (
                  <>Finalize when the group has decided.</>
                )}
              </div>
              <FinalizeButton groupId={groupId} disabled={!version} />
            </div>
          ) : null}

          {closed ? (
            <div className="border-border/60 mt-6 flex items-center gap-2 border-t pt-6 text-sm">
              <CheckCheck className="text-emerald-500 size-4" />
              <span>
                Voting closed.{" "}
                <a
                  href={`/trips/${tripId}`}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Go to the trip
                </a>
                .
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        <Card className="border-border/70 shadow-none">
          <CardContent className="p-6">
            <header className="mb-4 flex items-baseline justify-between">
              <div>
                <h2 className="font-display text-lg tracking-tight">
                  Candidates
                </h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Click 1 / 3 / 5 to vote — click again to clear.
                </p>
              </div>
              {!closed ? <ProposeCandidateButton groupId={groupId} /> : null}
            </header>

            {ranked.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No candidates yet. Add the first one.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {ranked.map((c) => (
                  <CandidateRow
                    key={c.id}
                    candidate={c}
                    currentUserId={currentUserId}
                    closed={closed}
                    canRemove={
                      c.proposedById === currentUserId || isOwner
                    }
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-none">
          <CardContent className="p-6">
            <h2 className="font-display text-lg tracking-tight">
              In the room
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {members.map((m) => {
                const initials = m.name
                  .split(" ")
                  .map((s) => s[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <li
                    key={m.userId}
                    className="border-border/70 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
                  >
                    <Avatar className="size-5">
                      {m.avatarUrl ? (
                        <AvatarImage src={m.avatarUrl} alt="" />
                      ) : null}
                      <AvatarFallback className="text-[9px]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {m.name}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function weight(c: CandidateShape) {
  return c.votes.reduce((s, v) => s + v.weight, 0);
}

function CandidateRow({
  candidate,
  currentUserId,
  closed,
  canRemove,
}: {
  candidate: CandidateShape;
  currentUserId: string;
  closed: boolean;
  canRemove: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const myVote = candidate.votes.find((v) => v.userId === currentUserId);

  function vote(weight: number) {
    if (closed || pending) return;
    startTransition(async () => {
      await castVoteAction(candidate.id, weight);
    });
  }

  return (
    <li className="border-border/70 bg-card flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {candidate.city}
            <span className="text-muted-foreground">
              , {candidate.country}
            </span>
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Proposed by {candidate.proposedBy.name}
          </p>
          {candidate.reason ? (
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed italic">
              &ldquo;{candidate.reason}&rdquo;
            </p>
          ) : null}
        </div>
        {canRemove && !closed ? (
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            aria-label="Remove candidate"
            onClick={() =>
              startTransition(async () => {
                await removeCandidateAction(candidate.id);
              })
            }
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          {candidate.votes.length}{" "}
          {candidate.votes.length === 1 ? "vote" : "votes"} · weight{" "}
          {weight(candidate)}
        </p>
        <div className="flex items-center gap-1">
          {[1, 3, 5].map((w) => (
            <button
              key={w}
              type="button"
              disabled={closed || pending}
              onClick={() => vote(w)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums transition",
                myVote?.weight === w
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}

function ProposeCandidateButton({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [reason, setReason] = useState("");

  function submit() {
    if (!city.trim() || !country.trim() || pending) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("city", city);
      fd.set("country", country);
      fd.set("reason", reason);
      const result = await proposeCandidateAction(groupId, null, fd);
      if (result.ok) {
        setOpen(false);
        setCity("");
        setCountry("");
        setReason("");
        toast.success(`${city} added`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="size-4" />
          Propose
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg tracking-tight">
            Propose a place
          </DialogTitle>
          <DialogDescription>
            Pick from the city library or type one in. Add a short reason if
            you want.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <CitySearchDialog
              trigger={
                <Button type="button" variant="outline" size="sm">
                  Pick from list
                </Button>
              }
              onPick={(c) => {
                setCity(c.name);
                setCountry(c.country);
              }}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="propose-city" label="City" required>
              <Input
                id="propose-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bali"
                required
              />
            </Field>
            <Field id="propose-country" label="Country" required>
              <Input
                id="propose-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Indonesia"
                required
              />
            </Field>
          </div>
          <Field id="propose-reason" label="Reason">
            <Textarea
              id="propose-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={280}
              placeholder="Optional — why this place?"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending} className="gap-2">
            <ArrowRight className="size-4" />
            Add to candidates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FinalizeButton({
  groupId,
  disabled,
}: {
  groupId: string;
  disabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      disabled={disabled || pending}
      className="gap-2"
      onClick={() =>
        startTransition(async () => {
          const result = await finalizeBlendAction(groupId);
          if (result && !result.ok) toast.error(result.error);
        })
      }
    >
      <CheckCheck className="size-4" />
      {pending ? "Finalizing" : "Finalize"}
    </Button>
  );
}
