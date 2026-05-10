import { addDays, format, getDay, startOfMonth, endOfMonth } from "date-fns";

import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/lib/category";

interface ActivityShape {
  id: string;
  name: string;
  day: number;
  category: string;
  estimatedCost: number;
}

interface StopShape {
  id: string;
  city: string;
  arrivalDay: number;
  departureDay: number;
  orderIndex: number;
  activities: ActivityShape[];
}

interface ItineraryCalendarProps {
  startDate: Date;
  totalDays: number;
  stops: StopShape[];
}

const STOP_COLOURS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function ItineraryCalendar({
  startDate,
  totalDays,
  stops,
}: ItineraryCalendarProps) {
  // Build a day → { date, stop, activities } map.
  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = addDays(startDate, i);
    const dayNum = i + 1;
    const stop = stops.find(
      (s) => dayNum >= s.arrivalDay && dayNum <= s.departureDay,
    );
    const activities = stop
      ? stop.activities.filter((a) => a.day === dayNum)
      : [];
    return { date, dayNum, stop, activities };
  });

  // Group days into calendar weeks aligned to the trip's first month.
  const firstDate = days[0].date;
  const monthStart = startOfMonth(firstDate);
  const monthEnd = endOfMonth(addDays(firstDate, totalDays - 1));
  const totalCells = Math.ceil(
    (monthEnd.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000) + 1,
  );
  const offsetBeforeFirstDay = getDay(monthStart);
  const cells = Array.from({ length: totalCells + offsetBeforeFirstDay }).map(
    (_, idx) => {
      const date = addDays(monthStart, idx - offsetBeforeFirstDay);
      const matchedDay = days.find(
        (d) =>
          d.date.getFullYear() === date.getFullYear() &&
          d.date.getMonth() === date.getMonth() &&
          d.date.getDate() === date.getDate(),
      );
      return { date, ...matchedDay };
    },
  );

  // Pad to multiple of 7
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    cells.push({ date: addDays(last.date, 1) });
  }

  return (
    <div>
      <div className="border-border/60 mb-3 grid grid-cols-7 gap-px border-b text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 pb-2">
            {d}
          </div>
        ))}
      </div>
      <div className="bg-border/60 grid grid-cols-7 gap-px overflow-hidden rounded-md">
        {cells.map((cell, i) => {
          const inTrip = Boolean(cell.dayNum);
          const stopIdx =
            cell.stop !== undefined
              ? stops.findIndex((s) => s.id === cell.stop?.id)
              : -1;
          const colour =
            stopIdx >= 0
              ? STOP_COLOURS[stopIdx % STOP_COLOURS.length]
              : undefined;
          return (
            <div
              key={i}
              className={cn(
                "bg-card relative flex min-h-[110px] flex-col gap-1 p-2",
                !inTrip && "bg-muted/30",
              )}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={cn(
                    "font-display text-sm leading-none tracking-tight",
                    !inTrip && "text-muted-foreground/60",
                  )}
                >
                  {format(cell.date, "d")}
                </span>
                {cell.dayNum ? (
                  <span className="text-muted-foreground text-[10px] tabular-nums">
                    Day {cell.dayNum}
                  </span>
                ) : null}
              </div>
              {cell.stop ? (
                <div
                  className="flex items-center gap-1.5"
                  aria-label={cell.stop.city}
                >
                  <span
                    aria-hidden
                    className="inline-block size-1.5 rounded-full"
                    style={{ background: colour }}
                  />
                  <span className="text-foreground truncate text-[11px] font-medium">
                    {cell.stop.city}
                  </span>
                </div>
              ) : null}
              {cell.activities && cell.activities.length > 0 ? (
                <ul className="mt-0.5 flex flex-col gap-0.5">
                  {cell.activities.slice(0, 3).map((a) => (
                    <li
                      key={a.id}
                      className="text-muted-foreground flex items-center gap-1 truncate text-[11px]"
                      title={a.name}
                    >
                      <CategoryIcon
                        category={a.category}
                        className="size-3 shrink-0"
                      />
                      <span className="truncate">{a.name}</span>
                    </li>
                  ))}
                  {cell.activities.length > 3 ? (
                    <li className="text-muted-foreground text-[10px]">
                      +{cell.activities.length - 3} more
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
