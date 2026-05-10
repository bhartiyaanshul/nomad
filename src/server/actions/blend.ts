"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addDays } from "date-fns";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { publish } from "@/lib/blend-bus";
import {
  generate,
  OllamaError,
  OllamaUnavailableError,
} from "@/lib/ai/ollama";
import { BLEND_SYSTEM, renderBlendUser } from "@/lib/ai/prompts/blend";
import {
  itineraryJsonSchema,
  itinerarySchema,
  type ItineraryOutput,
} from "@/lib/ai/schemas/itinerary";
import { geocodeCity } from "@/lib/geocode";
import { tripDayCount } from "@/lib/format";
import { fail, ok, type ActionResult } from "./result";

async function requireMember(tripId: string, userId: string) {
  const trip = await db.trip.findFirst({
    where: {
      id: tripId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId, status: "active" } } },
      ],
    },
    select: {
      id: true,
      ownerId: true,
      currency: true,
      personality: true,
      totalBudget: true,
      startDate: true,
      endDate: true,
      members: {
        select: { userId: true, user: { select: { personality: true } } },
      },
    },
  });
  return trip;
}

export async function startBlendAction(
  tripId: string,
  votingDeadline?: string,
): Promise<ActionResult<{ groupId: string }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { id: true, ownerId: true },
  });
  if (!trip || trip.ownerId !== session.user.id) return fail("Trip not found");

  const existing = await db.blendGroup.findUnique({ where: { tripId } });
  if (existing) return ok({ groupId: existing.id });

  const group = await db.blendGroup.create({
    data: {
      tripId,
      status: "voting",
      votingDeadline: votingDeadline ? new Date(votingDeadline) : null,
    },
  });

  revalidatePath(`/trips/${tripId}/blend`);
  return ok({ groupId: group.id });
}

const proposeSchema = z.object({
  city: z.string().trim().min(1).max(80),
  country: z.string().trim().min(1).max(80),
  reason: z.string().max(280).optional().nullable(),
});

export async function proposeCandidateAction(
  groupId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const group = await db.blendGroup.findUnique({
    where: { id: groupId },
    select: { id: true, status: true, tripId: true },
  });
  if (!group) return fail("Group not found");
  if (group.status !== "voting") return fail("Voting has closed");

  const trip = await requireMember(group.tripId, session.user.id);
  if (!trip) return fail("Trip not found");

  const parsed = proposeSchema.safeParse({
    city: formData.get("city"),
    country: formData.get("country"),
    reason: formData.get("reason") || null,
  });
  if (!parsed.success) {
    return fail("Check the highlighted fields", parsed.error.flatten().fieldErrors);
  }

  const candidate = await db.placeCandidate.create({
    data: {
      blendGroupId: groupId,
      city: parsed.data.city,
      country: parsed.data.country,
      proposedById: session.user.id,
      reason: parsed.data.reason ?? null,
    },
  });

  publish({
    groupId,
    type: "candidate_added",
    payload: { candidateId: candidate.id },
    ts: Date.now(),
  });

  scheduleBlendRegeneration(groupId);
  revalidatePath(`/trips/${group.tripId}/blend`);
  return ok({ id: candidate.id });
}

const voteSchema = z.object({
  weight: z.coerce.number().int().min(1).max(5).default(1),
});

export async function castVoteAction(
  candidateId: string,
  weight: number,
): Promise<ActionResult<{ removed: boolean }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const candidate = await db.placeCandidate.findUnique({
    where: { id: candidateId },
    select: {
      id: true,
      blendGroupId: true,
      blendGroup: {
        select: { status: true, tripId: true },
      },
    },
  });
  if (!candidate) return fail("Candidate not found");
  if (candidate.blendGroup.status !== "voting") return fail("Voting closed");

  const trip = await requireMember(candidate.blendGroup.tripId, session.user.id);
  if (!trip) return fail("Trip not found");

  const parsed = voteSchema.safeParse({ weight });
  if (!parsed.success) return fail("Invalid weight");

  // Toggle: clicking the same weight clears the vote.
  const existing = await db.vote.findUnique({
    where: { candidateId_userId: { candidateId, userId: session.user.id } },
  });

  if (existing && existing.weight === parsed.data.weight) {
    await db.vote.delete({ where: { id: existing.id } });
    publish({
      groupId: candidate.blendGroupId,
      type: "vote_cast",
      payload: { candidateId, removed: true },
      ts: Date.now(),
    });
    scheduleBlendRegeneration(candidate.blendGroupId);
    revalidatePath(`/trips/${candidate.blendGroup.tripId}/blend`);
    return ok({ removed: true });
  }

  await db.vote.upsert({
    where: { candidateId_userId: { candidateId, userId: session.user.id } },
    create: {
      candidateId,
      userId: session.user.id,
      weight: parsed.data.weight,
    },
    update: { weight: parsed.data.weight },
  });

  publish({
    groupId: candidate.blendGroupId,
    type: "vote_cast",
    payload: { candidateId, weight: parsed.data.weight },
    ts: Date.now(),
  });

  scheduleBlendRegeneration(candidate.blendGroupId);
  revalidatePath(`/trips/${candidate.blendGroup.tripId}/blend`);
  return ok({ removed: false });
}

export async function removeCandidateAction(candidateId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  const candidate = await db.placeCandidate.findUnique({
    where: { id: candidateId },
    select: {
      id: true,
      proposedById: true,
      blendGroupId: true,
      blendGroup: {
        select: {
          status: true,
          tripId: true,
          trip: { select: { ownerId: true } },
        },
      },
    },
  });
  if (!candidate) return;
  if (candidate.blendGroup.status !== "voting") return;
  const canRemove =
    candidate.proposedById === session.user.id ||
    candidate.blendGroup.trip.ownerId === session.user.id;
  if (!canRemove) return;

  await db.placeCandidate.delete({ where: { id: candidateId } });
  publish({
    groupId: candidate.blendGroupId,
    type: "candidate_removed",
    payload: { candidateId },
    ts: Date.now(),
  });
  scheduleBlendRegeneration(candidate.blendGroupId);
  revalidatePath(`/trips/${candidate.blendGroup.tripId}/blend`);
}

// ============================================================
// Live regeneration — debounced 5s after the last vote / proposal
// ============================================================
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleBlendRegeneration(groupId: string) {
  const existing = debounceTimers.get(groupId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    debounceTimers.delete(groupId);
    void regenerateBlendItinerary(groupId).catch((err) =>
      console.error("[blend] regenerate failed", err),
    );
  }, 5_000);
  debounceTimers.set(groupId, t);
}

export async function regenerateBlendItinerary(
  groupId: string,
): Promise<void> {
  const group = await db.blendGroup.findUnique({
    where: { id: groupId },
    include: {
      trip: {
        select: {
          id: true,
          currency: true,
          totalBudget: true,
          startDate: true,
          endDate: true,
          members: {
            select: { user: { select: { personality: true } } },
          },
        },
      },
      candidates: {
        include: { votes: { select: { weight: true } } },
      },
      itineraryVersions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });
  if (!group || group.status !== "voting") return;
  if (group.candidates.length === 0) return;

  const ranked = group.candidates
    .map((c) => ({
      city: c.city,
      country: c.country,
      voteWeight: c.votes.reduce((s, v) => s + v.weight, 0),
      votes: c.votes.length,
    }))
    .sort((a, b) => b.voteWeight - a.voteWeight);

  const days = tripDayCount(group.trip.startDate, group.trip.endDate);
  const personalitiesList = group.trip.members
    .map((m) => m.user.personality)
    .filter((p): p is string => Boolean(p));

  const personalityMix: Record<string, number> = {};
  for (const p of personalitiesList) {
    personalityMix[p] = (personalityMix[p] ?? 0) + 1;
  }
  const totalPeople = personalitiesList.length || 1;
  for (const k of Object.keys(personalityMix)) {
    personalityMix[k] = (personalityMix[k] / totalPeople) * 100;
  }

  const userPrompt = renderBlendUser({
    days,
    budget: group.trip.totalBudget ?? 1500,
    currency: group.trip.currency,
    groupSize: group.trip.members.length,
    personalitiesList,
    candidates: ranked,
    maxStops: Math.min(ranked.length, Math.max(2, Math.ceil(days / 3))),
    personalityMix,
    previousSummary:
      (group.itineraryVersions[0]?.itineraryJson
        ? (JSON.parse(group.itineraryVersions[0].itineraryJson as string) as {
            trip_summary?: string;
          }).trip_summary
        : undefined) ?? undefined,
  });

  let result: ItineraryOutput;
  try {
    result = await generate({
      system: BLEND_SYSTEM,
      user: userPrompt,
      schema: itineraryJsonSchema,
      temperature: 0.6,
      validate: (raw) => itinerarySchema.parse(raw),
    });
  } catch (err) {
    if (err instanceof OllamaUnavailableError || err instanceof OllamaError) {
      console.warn("[blend] AI unavailable, skipping regeneration");
      return;
    }
    console.error("[blend] AI failure", err);
    return;
  }

  const nextVersion = (group.itineraryVersions[0]?.versionNumber ?? 0) + 1;

  await db.blendItineraryVersion.create({
    data: {
      blendGroupId: groupId,
      versionNumber: nextVersion,
      itineraryJson: JSON.stringify(result),
      triggerEvent: "vote_added",
    },
  });

  publish({
    groupId,
    type: "itinerary_updated",
    payload: { versionNumber: nextVersion },
    ts: Date.now(),
  });

  revalidatePath(`/trips/${group.trip.id}/blend`);
}

export async function finalizeBlendAction(
  groupId: string,
): Promise<ActionResult<never>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const group = await db.blendGroup.findUnique({
    where: { id: groupId },
    include: {
      trip: { select: { id: true, ownerId: true, currency: true, startDate: true } },
      itineraryVersions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });
  if (!group) return fail("Group not found");
  if (group.trip.ownerId !== session.user.id)
    return fail("Only the trip owner can finalize");
  if (group.itineraryVersions.length === 0)
    return fail("Generate an itinerary first by adding candidates");

  const latest = group.itineraryVersions[0];
  let parsed: ItineraryOutput;
  try {
    parsed = itinerarySchema.parse(JSON.parse(latest.itineraryJson as string));
  } catch {
    return fail("Latest itinerary version is malformed");
  }

  await db.$transaction(async (tx) => {
    // Wipe existing stops and activities; replace with the blend itinerary.
    await tx.activity.deleteMany({
      where: { stop: { tripId: group.trip.id } },
    });
    await tx.stop.deleteMany({ where: { tripId: group.trip.id } });

    for (let i = 0; i < parsed.stops.length; i++) {
      const s = parsed.stops[i];
      const coords = await geocodeCity(s.city, s.country);
      const stop = await tx.stop.create({
        data: {
          tripId: group.trip.id,
          city: s.city,
          country: s.country,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          arrivalDay: s.arrival_day,
          departureDay: s.departure_day,
          orderIndex: i,
          summary: s.summary,
          accomName: s.accommodation.name,
          accomType: s.accommodation.type,
          accomCostPerNight: s.accommodation.cost_per_night,
          dailyFoodEstimate: s.daily_food_estimate,
          transportMode: s.transport_to_next?.mode ?? null,
          transportCost: s.transport_to_next?.cost ?? null,
          transportHours: s.transport_to_next?.duration_hours ?? null,
        },
      });
      if (s.activities.length > 0) {
        await tx.activity.createMany({
          data: s.activities.map((a) => ({
            stopId: stop.id,
            name: a.name,
            description: a.description,
            day: a.day,
            category: a.category,
            estimatedCost: a.estimated_cost,
            estimatedDurationHours: a.estimated_duration_hours ?? null,
            personalityFit: a.personality_fit ?? null,
          })),
        });
      }
    }

    await tx.trip.update({
      where: { id: group.trip.id },
      data: { endDate: addDays(group.trip.startDate, parsed.total_days - 1) },
    });

    await tx.blendGroup.update({
      where: { id: groupId },
      data: { status: "finalized" },
    });
  });

  publish({
    groupId,
    type: "finalized",
    payload: { versionNumber: latest.versionNumber },
    ts: Date.now(),
  });

  revalidatePath(`/trips/${group.trip.id}`);
  revalidatePath(`/trips/${group.trip.id}/build`);
  redirect(`/trips/${group.trip.id}`);
}
