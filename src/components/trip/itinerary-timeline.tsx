import { Clock, MapPin, Wallet } from "lucide-react";

import { CategoryIcon, categoryLabel } from "@/lib/category";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ActivityShape {
  id: string;
  name: string;
  description: string;
  day: number;
  category: string;
  estimatedDurationHours: number | null;
  estimatedCost: number;
  imageUrl?: string | null;
}

interface StopShape {
  id: string;
  city: string;
  country: string;
  arrivalDay: number;
  departureDay: number;
  orderIndex: number;
  summary: string | null;
  activities: ActivityShape[];
}

interface ItineraryTimelineProps {
  stops: StopShape[];
  currency: string;
}

export function ItineraryTimeline({
  stops,
  currency,
}: ItineraryTimelineProps) {
  if (stops.length === 0) return null;

  return (
    <div className="space-y-12">
      {stops.map((stop) => {
        const days = Array.from(
          { length: stop.departureDay - stop.arrivalDay + 1 },
          (_, i) => stop.arrivalDay + i,
        );
        return (
          <section key={stop.id}>
            <div className="border-border/60 mb-6 flex items-baseline justify-between gap-3 border-b pb-3">
              <div>
                <p className="text-muted-foreground text-xs tracking-wider uppercase">
                  Stop {stop.orderIndex + 1} · Day {stop.arrivalDay}
                  {stop.departureDay > stop.arrivalDay
                    ? `–${stop.departureDay}`
                    : ""}
                </p>
                <h2 className="font-display mt-1 text-2xl tracking-tight">
                  {stop.city}
                  <span className="text-muted-foreground">, {stop.country}</span>
                </h2>
              </div>
            </div>

            {stop.summary ? (
              <p className="text-muted-foreground mb-6 max-w-3xl text-sm leading-relaxed">
                {stop.summary}
              </p>
            ) : null}

            <div className="space-y-8">
              {days.map((day) => {
                const dayActivities = stop.activities
                  .filter((a) => a.day === day)
                  .sort((a, b) => a.name.localeCompare(b.name));
                return (
                  <div
                    key={day}
                    className="grid gap-4 lg:grid-cols-[120px_1fr]"
                  >
                    <div className="text-muted-foreground text-sm">
                      <p className="font-medium tracking-wide uppercase">
                        Day {day}
                      </p>
                    </div>
                    <div>
                      {dayActivities.length === 0 ? (
                        <p className="text-muted-foreground text-sm italic">
                          Nothing planned yet.
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-3">
                          {dayActivities.map((act) => (
                            <ActivityRow
                              key={act.id}
                              activity={act}
                              currency={currency}
                            />
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ActivityRow({
  activity,
  currency,
  className,
}: {
  activity: ActivityShape;
  currency: string;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "border-border/70 bg-card flex flex-col gap-3 overflow-hidden rounded-md border p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="bg-accent text-accent-foreground rounded-md p-1.5">
            <CategoryIcon category={activity.category} className="size-4" />
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">
              {activity.name}
            </p>
            {activity.description ? (
              <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                {activity.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="text-muted-foreground tabular-nums flex items-center gap-3 text-xs">
          {activity.estimatedDurationHours ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {activity.estimatedDurationHours}h
            </span>
          ) : null}
          {activity.estimatedCost > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Wallet className="size-3" />
              {formatCurrency(activity.estimatedCost, currency)}
            </span>
          ) : null}
        </div>
      </div>
      {activity.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={activity.imageUrl}
          alt=""
          className="border-border/70 h-40 w-full rounded-md border object-cover"
        />
      ) : null}
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        <MapPin className="mr-1 inline size-3" />
        {categoryLabel(activity.category)}
      </p>
    </li>
  );
}
