"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generate,
  OllamaError,
  OllamaUnavailableError,
} from "@/lib/ai/ollama";
import {
  COMPATIBILITY_SYSTEM,
  renderCompatibilityUser,
  type TravelerSummary,
} from "@/lib/ai/prompts/compatibility";
import {
  compatibilityJsonSchema,
  compatibilitySchema,
  type CompatibilityOutput,
} from "@/lib/ai/schemas/compatibility";
import { fail, ok, type ActionResult } from "./result";

const personalityEnum = z.enum([
  "foodie",
  "adventurer",
  "culture",
  "chill",
  "social",
  "budget",
  "luxury",
  "mixed",
]);

const profileSchema = z.object({
  region: z.string().trim().min(2).max(80),
  startDate: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date"),
  endDate: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date"),
  personality: personalityEnum,
  budgetMin: z.coerce.number().nonnegative(),
  budgetMax: z.coerce.number().nonnegative(),
  currency: z.string().min(3).max(4),
  groupSize: z.coerce.number().int().min(2).max(10),
  pace: z.string().max(40).optional().nullable(),
  interests: z.string().max(200).optional().nullable(),
  languages: z.string().max(120).optional().nullable(),
  experience: z.string().max(120).optional().nullable(),
});

export async function upsertMatchProfileAction(
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const parsed = profileSchema.safeParse({
    region: formData.get("region"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    personality: formData.get("personality"),
    budgetMin: formData.get("budgetMin"),
    budgetMax: formData.get("budgetMax"),
    currency: formData.get("currency") || "USD",
    groupSize: formData.get("groupSize") || 2,
    pace: formData.get("pace") || null,
    interests: formData.get("interests") || null,
    languages: formData.get("languages") || null,
    experience: formData.get("experience") || null,
  });
  if (!parsed.success) {
    return fail("Check the highlighted fields", parsed.error.flatten().fieldErrors);
  }
  if (parsed.data.budgetMax < parsed.data.budgetMin) {
    return fail("Max budget must be greater than min", {
      budgetMax: ["Below the minimum"],
    });
  }
  if (new Date(parsed.data.endDate) < new Date(parsed.data.startDate)) {
    return fail("End date must be on or after start", {
      endDate: ["Before the start date"],
    });
  }

  const preferences = {
    pace: parsed.data.pace ?? null,
    interests: parsed.data.interests
      ? parsed.data.interests
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    languages: parsed.data.languages
      ? parsed.data.languages
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    experience: parsed.data.experience ?? null,
  };

  const existing = await db.travelMatch.findFirst({
    where: { userId: session.user.id, status: "open" },
  });

  const data = {
    userId: session.user.id,
    region: parsed.data.region,
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
    personality: parsed.data.personality,
    budgetMin: parsed.data.budgetMin,
    budgetMax: parsed.data.budgetMax,
    currency: parsed.data.currency,
    groupSize: parsed.data.groupSize,
    preferences: JSON.stringify(preferences),
    status: "open",
  };

  let record;
  if (existing) {
    record = await db.travelMatch.update({
      where: { id: existing.id },
      data,
    });
  } else {
    record = await db.travelMatch.create({ data });
  }

  revalidatePath("/match");
  return ok({ id: record.id });
}

export async function deleteMatchProfileAction() {
  const session = await auth();
  if (!session?.user?.id) return;
  await db.travelMatch.deleteMany({
    where: { userId: session.user.id, status: "open" },
  });
  revalidatePath("/match");
}

interface CandidateView {
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
  scoreDetails: CompatibilityOutput | null;
  alreadyRequested: boolean;
}

export async function browseMatchesAction(): Promise<{
  ok: true;
  mine: { id: string } | null;
  candidates: CandidateView[];
}> {
  const session = await auth();
  if (!session?.user?.id) return { ok: true, mine: null, candidates: [] };

  const mine = await db.travelMatch.findFirst({
    where: { userId: session.user.id, status: "open" },
  });
  if (!mine) return { ok: true, mine: null, candidates: [] };

  // Find other open profiles with overlapping region (case-insensitive substring),
  // overlapping date windows, and overlapping budget bands.
  const others = await db.travelMatch.findMany({
    where: {
      status: "open",
      userId: { not: session.user.id },
      // overlapping date window
      AND: [
        { startDate: { lte: mine.endDate } },
        { endDate: { gte: mine.startDate } },
        // overlapping budget
        { budgetMin: { lte: mine.budgetMax } },
        { budgetMax: { gte: mine.budgetMin } },
      ],
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      outboundRequests: {
        where: { fromMatchId: mine.id },
      },
    },
    take: 50,
  });

  const myPrefs = parsePreferences(mine.preferences);
  const myA: TravelerSummary = {
    personality: mine.personality,
    budgetMin: mine.budgetMin,
    budgetMax: mine.budgetMax,
    currency: mine.currency,
    pace: myPrefs.pace ?? "balanced",
    interests: myPrefs.interests,
    languages: myPrefs.languages,
    experience: myPrefs.experience ?? "unspecified",
  };

  const candidates: CandidateView[] = await Promise.all(
    others
      .filter((o) =>
        o.region.toLowerCase().includes(mine.region.toLowerCase()) ||
        mine.region.toLowerCase().includes(o.region.toLowerCase()),
      )
      .map(async (o) => {
        const prefs = parsePreferences(o.preferences);

        // Cache lookup — symmetric
        const [aId, bId] =
          session.user.id < o.userId
            ? [session.user.id, o.userId]
            : [o.userId, session.user.id];
        const cached = await db.matchScore.findUnique({
          where: { userAId_userBId: { userAId: aId, userBId: bId } },
        });

        let score: number | null = cached?.score ?? null;
        let details: CompatibilityOutput | null = null;
        if (cached) {
          try {
            details = compatibilitySchema.parse(JSON.parse(cached.dimensions));
          } catch {
            details = null;
          }
        }

        if (!cached) {
          try {
            const result = await generate({
              system: COMPATIBILITY_SYSTEM,
              user: renderCompatibilityUser(myA, {
                personality: o.personality,
                budgetMin: o.budgetMin,
                budgetMax: o.budgetMax,
                currency: o.currency,
                pace: prefs.pace ?? "balanced",
                interests: prefs.interests,
                languages: prefs.languages,
                experience: prefs.experience ?? "unspecified",
              }),
              schema: compatibilityJsonSchema,
              temperature: 0.3,
              validate: (raw) => compatibilitySchema.parse(raw),
            });
            await db.matchScore.upsert({
              where: { userAId_userBId: { userAId: aId, userBId: bId } },
              create: {
                userAId: aId,
                userBId: bId,
                score: result.overall_score,
                dimensions: JSON.stringify(result),
              },
              update: {
                score: result.overall_score,
                dimensions: JSON.stringify(result),
                computedAt: new Date(),
              },
            });
            score = result.overall_score;
            details = result;
          } catch (err) {
            if (
              err instanceof OllamaUnavailableError ||
              err instanceof OllamaError
            ) {
              // No score available; fall through to a deterministic floor.
              score = null;
              details = null;
            } else {
              console.error("[match] compatibility error", err);
            }
          }
        }

        return {
          matchId: o.id,
          user: o.user,
          region: o.region,
          startDate: o.startDate,
          endDate: o.endDate,
          personality: o.personality,
          budgetMin: o.budgetMin,
          budgetMax: o.budgetMax,
          currency: o.currency,
          preferences: prefs,
          score,
          scoreDetails: details,
          alreadyRequested: o.outboundRequests.length > 0,
        };
      }),
  );

  // Sort highest-score first (nulls last)
  candidates.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return { ok: true, mine: { id: mine.id }, candidates };
}

function parsePreferences(raw: string | null): {
  pace: string | null;
  interests: string[];
  languages: string[];
  experience: string | null;
} {
  if (!raw) return { pace: null, interests: [], languages: [], experience: null };
  try {
    const parsed = JSON.parse(raw) as {
      pace?: string;
      interests?: string[];
      languages?: string[];
      experience?: string;
    };
    return {
      pace: parsed.pace ?? null,
      interests: parsed.interests ?? [],
      languages: parsed.languages ?? [],
      experience: parsed.experience ?? null,
    };
  } catch {
    return { pace: null, interests: [], languages: [], experience: null };
  }
}

export async function connectMatchAction(
  toMatchId: string,
): Promise<ActionResult<{ status: "matched" | "pending" }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthenticated");

  const myMatch = await db.travelMatch.findFirst({
    where: { userId: session.user.id, status: "open" },
  });
  if (!myMatch) return fail("Create your match profile first");

  const target = await db.travelMatch.findUnique({
    where: { id: toMatchId },
    select: { id: true, userId: true, status: true, region: true },
  });
  if (!target || target.status !== "open") return fail("Profile not found");
  if (target.userId === session.user.id) return fail("That's your own profile");

  // If a request from them to me already exists, this becomes a mutual match.
  const reverse = await db.matchRequest.findUnique({
    where: {
      fromMatchId_toMatchId: {
        fromMatchId: target.id,
        toMatchId: myMatch.id,
      },
    },
  });

  if (reverse) {
    // Mutual match: create a shared trip with both users as members and
    // close out both match profiles.
    const trip = await db.$transaction(async (tx) => {
      await tx.matchRequest.update({
        where: { id: reverse.id },
        data: { status: "accepted" },
      });
      const newRequest = await tx.matchRequest.upsert({
        where: {
          fromMatchId_toMatchId: {
            fromMatchId: myMatch.id,
            toMatchId: target.id,
          },
        },
        create: {
          fromMatchId: myMatch.id,
          toMatchId: target.id,
          status: "accepted",
        },
        update: { status: "accepted" },
      });
      void newRequest;

      await tx.travelMatch.updateMany({
        where: { id: { in: [myMatch.id, target.id] } },
        data: { status: "matched" },
      });

      const trip = await tx.trip.create({
        data: {
          ownerId: session.user.id,
          name: `${myMatch.region} with new companion`,
          description: `Shared trip created from a Traveloop match in ${myMatch.region}.`,
          startDate: myMatch.startDate,
          endDate: myMatch.endDate,
          currency: myMatch.currency,
          personality: myMatch.personality,
          status: "draft",
        },
      });
      await tx.tripMember.createMany({
        data: [
          { tripId: trip.id, userId: session.user.id, role: "owner" },
          { tripId: trip.id, userId: target.userId, role: "traveler" },
        ],
      });
      await tx.userEvent.create({
        data: {
          userId: session.user.id,
          eventType: "match_made",
          metadata: JSON.stringify({
            tripId: trip.id,
            otherUserId: target.userId,
          }),
        },
      });
      return trip;
    });

    revalidatePath("/match");
    redirect(`/trips/${trip.id}`);
  }

  // Otherwise, store an outbound request.
  await db.matchRequest.upsert({
    where: {
      fromMatchId_toMatchId: {
        fromMatchId: myMatch.id,
        toMatchId: target.id,
      },
    },
    create: {
      fromMatchId: myMatch.id,
      toMatchId: target.id,
    },
    update: {},
  });

  revalidatePath("/match");
  return ok({ status: "pending" });
}
