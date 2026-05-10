import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DiscoverClient } from "@/components/discover/discover-client";
import { AIStatusBanner } from "@/components/ai/ai-status-banner";

export const metadata = { title: "Discover" };

export default async function DiscoverPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { personality: true },
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div>
        <p className="text-muted-foreground text-sm tracking-wide uppercase">
          Discover
        </p>
        <h1 className="font-display mt-2 text-3xl tracking-tight">
          Pinpoints in a region
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
          Pick a region and your travel pace. The model returns geographically
          clustered points of interest — a 60/40 mix of offbeat and well-known
          spots — that match your personality.
        </p>
      </div>

      <div className="mt-6">
        <AIStatusBanner />
      </div>

      <div className="mt-6">
        <DiscoverClient defaultPersonality={user?.personality ?? "mixed"} />
      </div>
    </div>
  );
}
