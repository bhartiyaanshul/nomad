// Pure functions to compute trip budget totals from stops + activities.
// Server-side first, then handed to chart components as props.

export interface BudgetStopShape {
  id: string;
  city: string;
  arrivalDay: number;
  departureDay: number;
  orderIndex: number;
  accomCostPerNight: number | null;
  dailyFoodEstimate: number | null;
  transportCost: number | null;
  activities: Array<{
    day: number;
    category: string;
    estimatedCost: number;
  }>;
}

export type BudgetCategory =
  | "accommodation"
  | "food"
  | "activities"
  | "transport"
  | "miscellaneous";

export interface BudgetTotals {
  byCategory: Record<BudgetCategory, number>;
  byStop: Array<{ stopId: string; city: string; total: number }>;
  byDay: Array<{ day: number; total: number }>;
  total: number;
  averagePerDay: number;
  daysOverBudget: number;
  budget: number | null;
  pctOfBudget: number;
}

export function computeBudget(
  stops: BudgetStopShape[],
  totalDays: number,
  budget: number | null,
): BudgetTotals {
  const byCategory: Record<BudgetCategory, number> = {
    accommodation: 0,
    food: 0,
    activities: 0,
    transport: 0,
    miscellaneous: 0,
  };

  const byDayMap = new Map<number, number>();
  for (let d = 1; d <= totalDays; d++) byDayMap.set(d, 0);

  const byStop: BudgetTotals["byStop"] = [];

  for (const stop of stops) {
    let stopTotal = 0;
    const days = Math.max(0, stop.departureDay - stop.arrivalDay + 1);

    if (stop.accomCostPerNight) {
      const nights = Math.max(0, days - 1) || 1;
      const accom = stop.accomCostPerNight * nights;
      byCategory.accommodation += accom;
      stopTotal += accom;
      // Spread across nights starting from arrival.
      for (let d = stop.arrivalDay; d < stop.arrivalDay + nights; d++) {
        byDayMap.set(d, (byDayMap.get(d) ?? 0) + stop.accomCostPerNight);
      }
    }

    if (stop.dailyFoodEstimate) {
      const food = stop.dailyFoodEstimate * days;
      byCategory.food += food;
      stopTotal += food;
      for (let d = stop.arrivalDay; d <= stop.departureDay; d++) {
        byDayMap.set(d, (byDayMap.get(d) ?? 0) + stop.dailyFoodEstimate);
      }
    }

    if (stop.transportCost) {
      byCategory.transport += stop.transportCost;
      stopTotal += stop.transportCost;
      // Charge transport on the departure day.
      byDayMap.set(
        stop.departureDay,
        (byDayMap.get(stop.departureDay) ?? 0) + stop.transportCost,
      );
    }

    for (const a of stop.activities) {
      const c =
        a.category === "food" ? "food" : "activities";
      if (c === "food") byCategory.food += a.estimatedCost;
      else byCategory.activities += a.estimatedCost;
      stopTotal += a.estimatedCost;
      byDayMap.set(a.day, (byDayMap.get(a.day) ?? 0) + a.estimatedCost);
    }

    byStop.push({ stopId: stop.id, city: stop.city, total: stopTotal });
  }

  const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
  const averagePerDay = totalDays > 0 ? total / totalDays : 0;
  const dailyAllowance = budget && budget > 0 ? budget / totalDays : null;
  const daysOverBudget =
    dailyAllowance !== null
      ? Array.from(byDayMap.values()).filter((v) => v > dailyAllowance).length
      : 0;

  return {
    byCategory,
    byStop,
    byDay: Array.from(byDayMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, t]) => ({ day, total: Math.round(t * 100) / 100 })),
    total: Math.round(total * 100) / 100,
    averagePerDay: Math.round(averagePerDay * 100) / 100,
    daysOverBudget,
    budget,
    pctOfBudget: budget && budget > 0 ? Math.round((total / budget) * 100) : 0,
  };
}
