import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Hammer, MapPin } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ItineraryTimeline } from "@/components/trip/itinerary-timeline";
import { EmptyState } from "@/components/shared/empty-state";

interface TripPageProps {
  params: Promise<{ id: string }>;
}

export default async function TripPage({ params }: TripPageProps) {
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
      currency: true,
      description: true,
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

  if (!trip) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      {trip.description ? (
        <p className="text-muted-foreground mb-10 max-w-3xl text-sm leading-relaxed">
          {trip.description}
        </p>
      ) : null}

      {trip.stops.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No stops yet"
          description="Open the builder to add cities, days, accommodation, and activities."
          action={
            <Button asChild className="gap-2">
              <Link href={`/trips/${trip.id}/build`}>
                <Hammer className="size-4" />
                Open builder
              </Link>
            </Button>
          }
        />
      ) : (
        <ItineraryTimeline stops={trip.stops} currency={trip.currency} />
      )}
    </div>
  );
}
