import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Hammer, MapPin } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ItineraryTimeline } from "@/components/trip/itinerary-timeline";
import { ItineraryCalendar } from "@/components/trip/itinerary-calendar";
import { ItineraryMapDynamic } from "@/components/trip/itinerary-map-dynamic";
import { ViewModeSwitcher } from "@/components/trip/view-mode-switcher";
import { PrintButton } from "@/components/trip/print-button";
import { EmptyState } from "@/components/shared/empty-state";
import { tripDayCount } from "@/lib/format";

interface TripPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: "timeline" | "calendar" | "map" }>;
}

export default async function TripPage({ params, searchParams }: TripPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const { view = "timeline" } = await searchParams;

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
      startDate: true,
      endDate: true,
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
          latitude: true,
          longitude: true,
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
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  if (!trip) notFound();

  const totalDays = tripDayCount(trip.startDate, trip.endDate);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 print-region">
      {trip.description ? (
        <p className="text-muted-foreground mb-8 max-w-3xl text-sm leading-relaxed">
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
        <>
          <div
            className="mb-8 flex flex-wrap items-center justify-between gap-3"
            data-no-print
          >
            <ViewModeSwitcher />
            <PrintButton />
          </div>

          {view === "timeline" ? (
            <ItineraryTimeline stops={trip.stops} currency={trip.currency} />
          ) : view === "calendar" ? (
            <ItineraryCalendar
              startDate={trip.startDate}
              totalDays={totalDays}
              stops={trip.stops.map((s) => ({
                id: s.id,
                city: s.city,
                arrivalDay: s.arrivalDay,
                departureDay: s.departureDay,
                orderIndex: s.orderIndex,
                activities: s.activities.map((a) => ({
                  id: a.id,
                  name: a.name,
                  day: a.day,
                  category: a.category,
                  estimatedCost: a.estimatedCost,
                })),
              }))}
            />
          ) : (
            <ItineraryMapDynamic
              stops={trip.stops.map((s) => ({
                id: s.id,
                city: s.city,
                country: s.country,
                arrivalDay: s.arrivalDay,
                departureDay: s.departureDay,
                orderIndex: s.orderIndex,
                latitude: s.latitude,
                longitude: s.longitude,
                activitiesCount: s.activities.length,
              }))}
            />
          )}
        </>
      )}
    </div>
  );
}
