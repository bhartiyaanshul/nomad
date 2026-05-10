"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { Check, Send } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { connectMatchAction } from "@/server/actions/match";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  match: {
    matchId: string;
    user: { id: string; name: string; avatarUrl: string | null };
    region: string;
    startDate: Date;
    endDate: Date;
    personality: string;
    budgetMin: number;
    budgetMax: number;
    currency: string;
    preferences: {
      pace: string | null;
      interests: string[];
      languages: string[];
      experience: string | null;
    };
    score: number | null;
    scoreDetails: {
      overall_score: number;
      dimensions: {
        personality: number;
        budget: number;
        pace: number;
        interests: number;
        communication: number;
      };
      strength: string;
      friction_point: string;
      recommendation: string;
    } | null;
    alreadyRequested: boolean;
  };
}

const RECOMMENDATION_LABELS: Record<string, string> = {
  strong_match: "Strong match",
  good_match: "Good match",
  moderate_match: "Moderate match",
  weak_match: "Weak match",
  not_recommended: "Not recommended",
};

export function MatchCard({ match }: MatchCardProps) {
  const [pending, startTransition] = useTransition();
  const initials = match.user.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="border-border/70 bg-card flex flex-col gap-5 rounded-md border p-6">
      <header className="flex items-start gap-4">
        <Avatar className="size-12">
          {match.user.avatarUrl ? (
            <AvatarImage src={match.user.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium">{match.user.name}</p>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {match.region} · {format(match.startDate, "d MMM")}–
            {format(match.endDate, "d MMM yyyy")}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] capitalize">
              {match.personality}
            </Badge>
            <Badge variant="secondary" className="text-[10px] tabular-nums">
              {Intl.NumberFormat("en-US", {
                style: "currency",
                currency: match.currency,
                maximumFractionDigits: 0,
              }).format(match.budgetMin)}
              –
              {Intl.NumberFormat("en-US", {
                style: "currency",
                currency: match.currency,
                maximumFractionDigits: 0,
              }).format(match.budgetMax)}
              /day
            </Badge>
            {match.preferences.pace ? (
              <Badge variant="secondary" className="text-[10px] capitalize">
                {match.preferences.pace} pace
              </Badge>
            ) : null}
          </div>
        </div>
        {match.score !== null ? (
          <div className="text-right">
            <p
              className={cn(
                "font-display text-3xl tabular-nums tracking-tight",
                match.score >= 75
                  ? "text-emerald-600 dark:text-emerald-400"
                  : match.score >= 50
                    ? "text-foreground"
                    : "text-muted-foreground",
              )}
            >
              {match.score}
            </p>
            {match.scoreDetails ? (
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                {RECOMMENDATION_LABELS[match.scoreDetails.recommendation] ??
                  ""}
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      {match.scoreDetails ? (
        <div className="grid gap-2 text-xs">
          {(["personality", "budget", "pace", "interests", "communication"] as const).map(
            (k) => (
              <div key={k} className="flex items-center gap-3">
                <span className="text-muted-foreground w-24 capitalize">
                  {k}
                </span>
                <Progress
                  value={match.scoreDetails!.dimensions[k]}
                  className="h-1.5 flex-1"
                />
                <span className="text-muted-foreground tabular-nums w-8 text-right">
                  {match.scoreDetails!.dimensions[k]}
                </span>
              </div>
            ),
          )}
        </div>
      ) : null}

      {match.scoreDetails ? (
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
              Strength
            </p>
            <p className="mt-1 leading-relaxed">
              {match.scoreDetails.strength}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
              Friction
            </p>
            <p className="mt-1 leading-relaxed">
              {match.scoreDetails.friction_point}
            </p>
          </div>
        </div>
      ) : null}

      {match.preferences.interests.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          Interests:{" "}
          <span className="text-foreground">
            {match.preferences.interests.join(" · ")}
          </span>
        </p>
      ) : null}

      <footer className="border-border/60 flex items-center justify-end border-t pt-4">
        {match.alreadyRequested ? (
          <Button variant="outline" size="sm" disabled className="gap-2">
            <Check className="size-4" />
            Request sent
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={pending}
            className="gap-2"
            onClick={() =>
              startTransition(async () => {
                const result = await connectMatchAction(match.matchId);
                if (result && !result.ok) toast.error(result.error);
                else if (result?.ok && result.data.status === "pending")
                  toast.success("Request sent");
              })
            }
          >
            <Send className="size-4" />
            Connect
          </Button>
        )}
      </footer>
    </article>
  );
}
