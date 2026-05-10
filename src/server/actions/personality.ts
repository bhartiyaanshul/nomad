"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scoreQuiz, type Personality } from "@/lib/personality";

const submitSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export async function submitPersonalityQuizAction(
  answers: Record<string, string>,
): Promise<{ ok: true; personality: Personality } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthenticated" };

  const parsed = submitSchema.safeParse({ answers });
  if (!parsed.success) return { ok: false, error: "Invalid quiz submission" };

  const { winner } = scoreQuiz(parsed.data.answers);

  await db.user.update({
    where: { id: session.user.id },
    data: { personality: winner },
  });

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true, personality: winner };
}

export async function skipPersonalityQuizAction(): Promise<{ ok: true }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: true };
  // Mark as "mixed" so we don't show again; user can change in Settings.
  await db.user.update({
    where: { id: session.user.id },
    data: { personality: "mixed" },
  });
  revalidatePath("/dashboard");
  return { ok: true };
}
