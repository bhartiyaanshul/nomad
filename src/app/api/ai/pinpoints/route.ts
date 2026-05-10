import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
  generate,
  OllamaError,
  OllamaUnavailableError,
} from "@/lib/ai/ollama";
import {
  PINPOINTS_SYSTEM,
  renderPinpointsUser,
} from "@/lib/ai/prompts/pinpoints";
import {
  pinpointsJsonSchema,
  pinpointsSchema,
} from "@/lib/ai/schemas/pinpoints";

export const runtime = "nodejs";
export const maxDuration = 90;

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

const requestSchema = z.object({
  region: z.string().trim().min(2).max(120),
  personality: personalityEnum,
  n: z.coerce.number().int().min(4).max(40).default(12),
  pace: z.enum(["fast", "balanced", "slow"]).default("balanced"),
  avoid: z.array(z.string()).default([]),
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

  const userPrompt = renderPinpointsUser({
    region: parsed.data.region,
    personality: parsed.data.personality,
    n: parsed.data.n,
    pace: parsed.data.pace,
    avoidList: parsed.data.avoid,
  });

  try {
    const result = await generate({
      system: PINPOINTS_SYSTEM.replace("{n}", String(parsed.data.n)),
      user: userPrompt,
      schema: pinpointsJsonSchema,
      temperature: 0.5,
      validate: (raw) => pinpointsSchema.parse(raw),
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof OllamaUnavailableError) {
      return NextResponse.json(
        { error: err.message, code: "ollama_unavailable" },
        { status: 503 },
      );
    }
    if (err instanceof OllamaError) {
      console.error("[ai/pinpoints] error", err);
      return NextResponse.json(
        { error: err.message, code: "ollama_error" },
        { status: 502 },
      );
    }
    if (err instanceof z.ZodError) {
      console.error("[ai/pinpoints] schema invalid", err.flatten());
      return NextResponse.json(
        { error: "AI returned a malformed response", code: "schema_invalid" },
        { status: 502 },
      );
    }
    console.error("[ai/pinpoints] unexpected", err);
    return NextResponse.json(
      { error: "Pinpoint discovery failed" },
      { status: 500 },
    );
  }
}
