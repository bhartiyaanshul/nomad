import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { ollamaHealth } from "@/lib/ai/ollama";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  }
  const status = await ollamaHealth();
  return NextResponse.json(status);
}
