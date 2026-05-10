import { notFound, redirect } from "next/navigation";
import { Luggage } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AddPackingForm } from "@/components/packing/add-packing-form";
import { PackingList } from "@/components/packing/packing-list";
import { PackingActions } from "@/components/packing/packing-actions";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata = { title: "Packing" };

interface PackingPageProps {
  params: Promise<{ id: string }>;
}

export default async function PackingPage({ params }: PackingPageProps) {
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
      ownerId: true,
      packingItems: {
        orderBy: [{ category: "asc" }, { item: "asc" }],
        select: {
          id: true,
          item: true,
          category: true,
          quantity: true,
          essential: true,
          packed: true,
          notes: true,
        },
      },
    },
  });
  if (!trip) notFound();

  const isOwner = trip.ownerId === session.user.id;
  const total = trip.packingItems.length;
  const packed = trip.packingItems.filter((i) => i.packed).length;
  const pct = total > 0 ? Math.round((packed / total) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm tracking-wide uppercase">
            Pre-trip
          </p>
          <h1 className="font-display mt-2 text-3xl tracking-tight">
            Packing
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
            A grouped checklist that adapts to your trip when you generate
            with AI — climate, activities, group size, and personality all
            shape the list.
          </p>
        </div>
        {isOwner ? <PackingActions tripId={trip.id} /> : null}
      </div>

      {total > 0 ? (
        <div className="mt-8">
          <div className="mb-2 flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-foreground tabular-nums font-medium">
              {packed} / {total} packed · {pct}%
            </span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
      ) : null}

      <Card className="border-border/70 mt-8 shadow-none">
        <CardContent className="p-6">
          <AddPackingForm tripId={trip.id} />
        </CardContent>
      </Card>

      <div className="mt-10">
        {total === 0 ? (
          <EmptyState
            icon={Luggage}
            title="No items yet"
            description="Add the first one above, or generate the standard list with AI based on your destinations and activities."
          />
        ) : (
          <PackingList items={trip.packingItems} isOwner={isOwner} />
        )}
      </div>
    </div>
  );
}
