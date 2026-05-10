import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { CreateTripForm } from "@/components/trip/create-trip-form";
import { NewTripModes } from "@/components/trip/new-trip-modes";
import { AIStatusBanner } from "@/components/ai/ai-status-banner";

export const metadata = { title: "Plan a new trip" };

export default async function NewTripPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { currency: true, personality: true },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href="/trips"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition"
      >
        <ArrowLeft className="size-4" />
        Back to trips
      </Link>

      <div className="mt-6 mb-10">
        <p className="text-muted-foreground text-sm tracking-wide uppercase">
          Plan a new trip
        </p>
        <h1 className="font-display mt-2 text-3xl tracking-tight">
          Where are you going?
        </h1>
        <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
          Generate a full multi-city plan with AI, or build it manually
          stop by stop.
        </p>
      </div>

      <AIStatusBanner />

      <NewTripModes
        defaultPersonality={user?.personality ?? null}
        defaultCurrency={user?.currency ?? "USD"}
      />

      <Card id="manual" className="border-border/70 shadow-sm">
        <CardContent className="p-8">
          <h2 className="font-display text-lg tracking-tight">
            Manual draft
          </h2>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">
            Set name, dates, and budget. You&apos;ll add stops next.
          </p>
          <CreateTripForm
            defaultCurrency={user?.currency ?? "USD"}
            defaultPersonality={user?.personality ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
