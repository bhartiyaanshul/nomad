import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generate,
  OllamaError,
  OllamaUnavailableError,
} from "@/lib/ai/ollama";
import {
  ALTERNATIVES_SYSTEM,
  renderAlternativesUser,
} from "@/lib/ai/prompts/alternatives";
import {
  alternativesJsonSchema,
  alternativesSchema,
} from "@/lib/ai/schemas/alternatives";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  stopId: z.string().min(1),
  reason: z.string().trim().min(1).max(200).default("Unspecified"),
  maxDistanceKm: z.coerce.number().positive().max(5000).default(500),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const stop = await db.stop.findUnique({
    where: { id: parsed.data.stopId },
    include: {
      activities: true,
      trip: {
        select: {
          ownerId: true,
          currency: true,
          personality: true,
          stops: {
            orderBy: { orderIndex: "asc" },
            select: {
              id: true,
              city: true,
              country: true,
              orderIndex: true,
            },
          },
        },
      },
    },
  });

  if (!stop || stop.trip.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  const days = Math.max(1, stop.departureDay - stop.arrivalDay + 1);
  const activitiesCost = stop.activities
    .filter((a) => !a.archived)
    .reduce((sum, a) => sum + a.estimatedCost, 0);
  const categories = Array.from(
    new Set(stop.activities.filter((a) => !a.archived).map((a) => a.category)),
  );

  const idx = stop.trip.stops.findIndex((s) => s.id === stop.id);
  const prev = idx > 0 ? stop.trip.stops[idx - 1] : null;
  const next =
    idx >= 0 && idx < stop.trip.stops.length - 1
      ? stop.trip.stops[idx + 1]
      : null;

  const userPrompt = renderAlternativesUser({
    originalCity: stop.city,
    originalCountry: stop.country,
    accomCost: stop.accomCostPerNight ?? 0,
    activitiesCost,
    currency: stop.trip.currency,
    categories,
    personality: stop.trip.personality ?? "mixed",
    prevCity: prev?.city ?? null,
    prevCountry: prev?.country ?? null,
    nextCity: next?.city ?? null,
    nextCountry: next?.country ?? null,
    numDays: days,
    reason: parsed.data.reason,
    maxDistanceKm: parsed.data.maxDistanceKm,
  });

  try {
    const result = await generate({
      system: ALTERNATIVES_SYSTEM.replace(
        "{maxDistanceKm}",
        String(parsed.data.maxDistanceKm),
      ),
      user: userPrompt,
      schema: alternativesJsonSchema,
      temperature: 0.4,
      validate: (raw) => alternativesSchema.parse(raw),
    });
    return NextResponse.json({ alternatives: result.alternatives });
  } catch (err) {
    if (err instanceof OllamaUnavailableError) {
      return NextResponse.json(
        { error: err.message, code: "ollama_unavailable" },
        { status: 503 },
      );
    }
    if (err instanceof OllamaError) {
      console.error("[ai/alternatives] Ollama error", err);
      return NextResponse.json(
        { error: err.message, code: "ollama_error" },
        { status: 502 },
      );
    }
    if (err instanceof z.ZodError) {
      console.error("[ai/alternatives] schema invalid", err.flatten());
      return NextResponse.json(
        { error: "AI returned a malformed response. Try again.", code: "schema_invalid" },
        { status: 502 },
      );
    }
    console.error("[ai/alternatives] unexpected", err);
    return NextResponse.json(
      { error: "Could not generate alternatives" },
      { status: 500 },
    );
  }
}
