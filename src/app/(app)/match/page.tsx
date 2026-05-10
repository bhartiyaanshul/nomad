import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { MatchProfileForm } from "@/components/match/match-profile-form";
import { MatchCard } from "@/components/match/match-card";
import { browseMatchesAction } from "@/server/actions/match";
import { EmptyState } from "@/components/shared/empty-state";
import { AIStatusBanner } from "@/components/ai/ai-status-banner";

export const metadata = { title: "Travel companions" };

export default async function MatchPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await db.travelMatch.findFirst({
    where: { userId: session.user.id, status: "open" },
  });

  let candidates: Awaited<ReturnType<typeof browseMatchesAction>>["candidates"] = [];
  if (profile) {
    const result = await browseMatchesAction();
    candidates = result.candidates;
  }

  let preferences: {
    pace: string | null;
    interests: string[];
    languages: string[];
    experience: string | null;
  } | null = null;
  if (profile?.preferences) {
    try {
      preferences = JSON.parse(profile.preferences);
    } catch {
      preferences = null;
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div>
        <p className="text-muted-foreground text-sm tracking-wide uppercase">
          Travel companions
        </p>
        <h1 className="font-display mt-2 text-3xl tracking-tight">
          Find someone to travel with
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
          Tell us where and when you&apos;re going, your style, and what
          you&apos;re looking for. We&apos;ll match you with travellers whose
          dates and preferences overlap. The model scores compatibility so the
          strongest matches surface first.
        </p>
      </div>

      <div className="mt-6">
        <AIStatusBanner />
      </div>

      <Card className="border-border/70 mt-6 shadow-none">
        <CardContent className="p-6">
          <h2 className="font-display text-lg tracking-tight">
            {profile ? "Your match profile" : "Create your match profile"}
          </h2>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">
            {profile
              ? "Update your details — changes are reflected on the next browse."
              : "Visible to other travellers searching for compatible people in the same region."}
          </p>
          <MatchProfileForm
            initial={
              profile
                ? {
                    region: profile.region,
                    startDate: profile.startDate.toISOString().slice(0, 10),
                    endDate: profile.endDate.toISOString().slice(0, 10),
                    personality: profile.personality,
                    budgetMin: profile.budgetMin,
                    budgetMax: profile.budgetMax,
                    currency: profile.currency,
                    groupSize: profile.groupSize,
                    pace: preferences?.pace ?? null,
                    interests: preferences?.interests ?? [],
                    languages: preferences?.languages ?? [],
                    experience: preferences?.experience ?? null,
                  }
                : null
            }
          />
        </CardContent>
      </Card>

      {profile ? (
        <section className="mt-12">
          <h2 className="font-display border-border/60 mb-6 border-b pb-2 text-lg tracking-wide uppercase text-muted-foreground">
            Compatible travellers
          </h2>
          {candidates.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No matches yet"
              description="No one else is in your region with overlapping dates and budget right now. Check back, or widen your region."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {candidates.map((c) => (
                <MatchCard key={c.matchId} match={c} />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
