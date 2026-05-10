import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TripSubNav } from "@/components/trip/trip-sub-nav";
import { TripActions } from "@/components/trip/trip-actions";
import { ShareToggle } from "@/components/trip/share-toggle";
import { formatDateRange, tripDayCount } from "@/lib/format";

interface TripLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function TripLayout({
  children,
  params,
}: TripLayoutProps) {
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
      name: true,
      startDate: true,
      endDate: true,
      ownerId: true,
      isPublic: true,
      shareSlug: true,
    },
  });

  if (!trip) notFound();

  const isOwner = trip.ownerId === session.user.id;
  const days = tripDayCount(trip.startDate, trip.endDate);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="bg-background">
      <header className="border-border/60 border-b">
        <div className="mx-auto w-full max-w-6xl px-6 pt-8 pb-4">
          <Link
            href="/trips"
            className="text-muted-foreground hover:text-foreground text-sm transition"
          >
            ← All trips
          </Link>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl tracking-tight">
                {trip.name}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {formatDateRange(trip.startDate, trip.endDate)} · {days}{" "}
                {days === 1 ? "day" : "days"}
              </p>
            </div>
            {isOwner ? (
              <div className="flex items-center gap-2">
                <ShareToggle
                  tripId={trip.id}
                  isPublic={trip.isPublic}
                  initialSlug={trip.shareSlug}
                  appUrl={appUrl}
                  tripName={trip.name}
                />
                <TripActions tripId={trip.id} />
              </div>
            ) : null}
          </div>
        </div>
        <TripSubNav tripId={trip.id} />
      </header>
      {children}
    </div>
  );
}
