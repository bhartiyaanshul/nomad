import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ItineraryTimeline } from "@/components/trip/itinerary-timeline";
import { CopyTripButton } from "@/components/trip/copy-trip-button";
import { WordMark } from "@/components/word-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { logShareViewAction } from "@/server/actions/share";
import {
  formatCurrency,
  formatDateRange,
  tripDayCount,
} from "@/lib/format";

interface SharePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { slug } = await params;
  const trip = await db.trip.findUnique({
    where: { shareSlug: slug },
    select: {
      isPublic: true,
      name: true,
      description: true,
      startDate: true,
      endDate: true,
      personality: true,
    },
  });

  if (!trip || !trip.isPublic) return { title: "Trip not found" };

  const desc =
    trip.description ??
    `A ${tripDayCount(trip.startDate, trip.endDate)}-day itinerary on Traveloop.`;

  return {
    title: trip.name,
    description: desc,
    openGraph: {
      title: trip.name,
      description: desc,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: trip.name,
      description: desc,
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { slug } = await params;
  const session = await auth();

  const trip = await db.trip.findUnique({
    where: { shareSlug: slug },
    select: {
      id: true,
      name: true,
      description: true,
      currency: true,
      startDate: true,
      endDate: true,
      personality: true,
      totalBudget: true,
      isPublic: true,
      viewCount: true,
      owner: { select: { name: true } },
      stops: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          city: true,
          country: true,
          arrivalDay: true,
          departureDay: true,
          orderIndex: true,
          summary: true,
          activities: {
            where: { archived: false },
            select: {
              id: true,
              name: true,
              description: true,
              day: true,
              category: true,
              estimatedDurationHours: true,
              estimatedCost: true,
            },
          },
        },
      },
    },
  });

  if (!trip || !trip.isPublic) notFound();

  // Fire-and-forget; logShareViewAction handles dedup internally.
  await logShareViewAction(slug);

  const days = tripDayCount(trip.startDate, trip.endDate);

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="border-border/60 border-b">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
          <WordMark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session ? (
              <CopyTripButton slug={slug} />
            ) : (
              <Button asChild size="sm">
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/share/${slug}`)}`}
                >
                  Sign in to copy
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="border-border/60 border-b pb-6">
          <p className="text-muted-foreground text-sm tracking-wide uppercase">
            Public itinerary by {trip.owner.name}
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-tight">
            {trip.name}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {formatDateRange(trip.startDate, trip.endDate)} · {days}{" "}
            {days === 1 ? "day" : "days"} ·{" "}
            {trip.stops.length} {trip.stops.length === 1 ? "stop" : "stops"}
            {trip.totalBudget ? (
              <>
                {" "}
                ·{" "}
                <span className="text-foreground tabular-nums">
                  {formatCurrency(trip.totalBudget, trip.currency)}
                </span>{" "}
                budget
              </>
            ) : null}
          </p>
          {trip.description ? (
            <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-relaxed">
              {trip.description}
            </p>
          ) : null}
          <p className="text-muted-foreground mt-3 text-xs">
            {trip.viewCount.toLocaleString()} views
          </p>
        </div>

        <div className="mt-10">
          <ItineraryTimeline stops={trip.stops} currency={trip.currency} />
        </div>

        <div className="border-border/60 mt-12 flex flex-col items-start gap-3 border-t pt-8">
          <p className="text-muted-foreground text-sm">
            Like this plan? Copy it into your own account to edit, share, or
            invite friends.
          </p>
          {session ? (
            <CopyTripButton slug={slug} />
          ) : (
            <Button asChild>
              <Link
                href={`/signup?callbackUrl=${encodeURIComponent(`/share/${slug}`)}`}
              >
                Create an account to copy
              </Link>
            </Button>
          )}
        </div>
      </main>

      <footer className="border-border/60 border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 text-sm">
          <span>Traveloop</span>
          <Link href="/" className="hover:text-foreground transition">
            Plan your own trip
          </Link>
        </div>
      </footer>
    </div>
  );
}
