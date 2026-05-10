import Link from "next/link";
import { MapPin, Users, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatCurrency,
  formatDateRange,
  formatTripStatus,
  tripDayCount,
} from "@/lib/format";

interface TripCardData {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  totalBudget: number | null;
  currency: string;
  personality: string | null;
  coverImageUrl: string | null;
  _count: { stops: number; members: number };
}

const STATUS_LABELS: Record<string, string> = {
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  completed: "Completed",
};

const PERSONALITY_LABELS: Record<string, string> = {
  foodie: "Foodie",
  adventurer: "Adventurer",
  culture: "Culture",
  chill: "Chill",
  social: "Social",
  budget: "Budget",
  luxury: "Luxury",
  mixed: "Mixed",
};

interface TripCardProps {
  trip: TripCardData;
}

export function TripCard({ trip }: TripCardProps) {
  const status = formatTripStatus(trip.startDate, trip.endDate);
  const days = tripDayCount(trip.startDate, trip.endDate);

  return (
    <Card className="border-border/70 group relative gap-0 overflow-hidden p-0 shadow-none transition hover:shadow-sm">
      <Link
        href={`/trips/${trip.id}`}
        className="absolute inset-0 z-0"
        aria-label={trip.name}
      />
      <div className="bg-muted relative aspect-[16/9] w-full">
        {trip.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trip.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="from-muted to-accent/40 h-full w-full bg-gradient-to-br" />
        )}
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur">
            {STATUS_LABELS[status]}
          </Badge>
          {trip.personality ? (
            <Badge
              variant="secondary"
              className="bg-background/90 backdrop-blur"
            >
              {PERSONALITY_LABELS[trip.personality] ?? trip.personality}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="relative z-10 flex flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-lg leading-tight tracking-tight">
            {trip.name}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {formatDateRange(trip.startDate, trip.endDate)} · {days}{" "}
            {days === 1 ? "day" : "days"}
          </p>
        </div>
        {trip.description ? (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {trip.description}
          </p>
        ) : null}
        <div className="text-muted-foreground flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            {trip._count.stops} {trip._count.stops === 1 ? "stop" : "stops"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            {trip._count.members}{" "}
            {trip._count.members === 1 ? "member" : "members"}
          </span>
          {trip.totalBudget ? (
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="size-3.5" />
              {formatCurrency(trip.totalBudget, trip.currency)}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
