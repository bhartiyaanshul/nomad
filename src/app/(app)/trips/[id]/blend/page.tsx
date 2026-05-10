import { notFound, redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { BlendRoom, type BlendItineraryVersion } from "@/components/blend/blend-room";
import { StartBlendButton } from "@/components/blend/start-blend-button";
import { AIStatusBanner } from "@/components/ai/ai-status-banner";

export const metadata = { title: "Trip Blend" };

interface BlendPageProps {
  params: Promise<{ id: string }>;
}

export default async function BlendPage({ params }: BlendPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const trip = await db.trip.findFirst({
    where: {
      id,
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id, status: "active" } } },
      ],
    },
    select: {
      id: true,
      ownerId: true,
      members: {
        select: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      },
      blendGroup: {
        include: {
          candidates: {
            include: {
              proposedBy: { select: { name: true, avatarUrl: true } },
              votes: { select: { userId: true, weight: true } },
            },
          },
          itineraryVersions: {
            orderBy: { versionNumber: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  if (!trip) notFound();

  const isOwner = trip.ownerId === session.user.id;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm tracking-wide uppercase">
            Group planning
          </p>
          <h1 className="font-display mt-2 text-3xl tracking-tight">
            Trip Blend
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            Everyone proposes places and votes. The model re-blends the
            itinerary in real time as preferences shift. The deadline is
            the decision.
          </p>
        </div>
        {!trip.blendGroup && isOwner ? (
          <StartBlendButton tripId={trip.id} />
        ) : null}
      </div>

      <div className="mt-6">
        <AIStatusBanner />
      </div>

      {!trip.blendGroup ? (
        <Card className="border-border/70 mt-6 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Sparkles className="text-muted-foreground size-5" />
            <p className="text-muted-foreground text-sm">
              {isOwner
                ? "Start a Blend to invite the group to vote on candidate cities."
                : "The trip owner hasn't started a Blend yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6">
          <BlendRoom
            groupId={trip.blendGroup.id}
            tripId={trip.id}
            isOwner={isOwner}
            currentUserId={session.user.id}
            status={trip.blendGroup.status as "voting" | "generating" | "finalized"}
            votingDeadline={
              trip.blendGroup.votingDeadline?.toISOString() ?? null
            }
            initialCandidates={trip.blendGroup.candidates.map((c) => ({
              id: c.id,
              city: c.city,
              country: c.country,
              reason: c.reason,
              proposedById: c.proposedById,
              proposedBy: {
                name: c.proposedBy.name,
                avatarUrl: c.proposedBy.avatarUrl,
              },
              votes: c.votes,
            }))}
            members={trip.members.map((m) => ({
              userId: m.user.id,
              name: m.user.name,
              avatarUrl: m.user.avatarUrl,
            }))}
            initialVersion={parseVersion(
              trip.blendGroup.itineraryVersions[0],
            )}
          />
        </div>
      )}
    </div>
  );
}

function parseVersion(
  v?: { versionNumber: number; generatedAt: Date; itineraryJson: unknown } | null,
): BlendItineraryVersion | null {
  if (!v) return null;
  let parsed: BlendItineraryVersion["itinerary"] = null;
  try {
    parsed = JSON.parse(
      typeof v.itineraryJson === "string"
        ? v.itineraryJson
        : JSON.stringify(v.itineraryJson),
    ) as BlendItineraryVersion["itinerary"];
  } catch {
    parsed = null;
  }
  return {
    versionNumber: v.versionNumber,
    generatedAt: v.generatedAt.toISOString(),
    itinerary: parsed,
  };
}
