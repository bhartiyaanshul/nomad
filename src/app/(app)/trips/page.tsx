import Link from "next/link";
import { redirect } from "next/navigation";
import { Map as MapIcon, Plus } from "lucide-react";
import { isAfter, isBefore } from "date-fns";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { TripCard } from "@/components/trip/trip-card";
import { TripsFilterBar } from "@/components/trip/trips-filter-bar";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata = { title: "Your trips" };

interface TripsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: "all" | "upcoming" | "ongoing" | "completed";
    sort?: "date-desc" | "date-asc" | "name" | "budget";
  }>;
}

export default async function TripsPage({ searchParams }: TripsPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const q = params.q?.trim();
  const status = params.status ?? "all";
  const sort = params.sort ?? "date-desc";

  const orderBy =
    sort === "name"
      ? { name: "asc" as const }
      : sort === "budget"
        ? { totalBudget: "desc" as const }
        : { startDate: sort === "date-asc" ? ("asc" as const) : ("desc" as const) };

  const trips = await db.trip.findMany({
    where: {
      ownerId: session.user.id,
      ...(q
        ? { name: { contains: q } } // SQLite is case-insensitive by default
        : {}),
    },
    include: {
      _count: { select: { stops: true, members: true } },
    },
    orderBy,
  });

  const now = new Date();
  const filtered =
    status === "all"
      ? trips
      : trips.filter((t) => {
          const before = isBefore(now, t.startDate);
          const after = isAfter(now, t.endDate);
          if (status === "upcoming") return before;
          if (status === "completed") return after;
          return !before && !after;
        });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm tracking-wide uppercase">
            Your trips
          </p>
          <h1 className="font-display mt-2 text-3xl tracking-tight">
            All trips
          </h1>
        </div>
        <Button asChild className="gap-2">
          <Link href="/trips/new">
            <Plus className="size-4" />
            Plan a new trip
          </Link>
        </Button>
      </div>

      <div className="mt-8">
        <TripsFilterBar />
      </div>

      <div className="mt-8">
        {filtered.length === 0 ? (
          <EmptyState
            icon={MapIcon}
            title={
              trips.length === 0
                ? "No trips yet"
                : "No trips match those filters"
            }
            description={
              trips.length === 0
                ? "Start with a manual draft or generate one with AI in Phase 3."
                : "Adjust the search, status, or sort to widen the result."
            }
            action={
              trips.length === 0 ? (
                <Button asChild>
                  <Link href="/trips/new">Plan a new trip</Link>
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
