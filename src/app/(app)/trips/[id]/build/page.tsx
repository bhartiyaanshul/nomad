import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tripDayCount } from "@/lib/format";
import { BuilderClient } from "@/components/trip/builder/builder-client";

interface BuildPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Build itinerary" };

export default async function BuildPage({ params }: BuildPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const trip = await db.trip.findFirst({
    where: { id, ownerId: session.user.id },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      totalBudget: true,
      currency: true,
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
          accomName: true,
          accomType: true,
          accomCostPerNight: true,
          transportMode: true,
          transportCost: true,
          transportHours: true,
          dailyFoodEstimate: true,
          activities: {
            where: { archived: false },
            orderBy: [{ day: "asc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              description: true,
              day: true,
              category: true,
              estimatedDurationHours: true,
              estimatedCost: true,
              bookingUrl: true,
            },
          },
        },
      },
    },
  });

  if (!trip) notFound();

  const totalDays = tripDayCount(trip.startDate, trip.endDate);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <BuilderClient
        trip={{
          id: trip.id,
          name: trip.name,
          startDate: trip.startDate,
          endDate: trip.endDate,
          totalBudget: trip.totalBudget,
          currency: trip.currency,
          totalDays,
          stops: trip.stops,
        }}
      />
    </div>
  );
}
