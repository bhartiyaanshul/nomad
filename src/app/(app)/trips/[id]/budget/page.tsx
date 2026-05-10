import { notFound, redirect } from "next/navigation";
import { AlertCircle, CalendarDays, Coins, Wallet } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { computeBudget } from "@/lib/budget";
import { tripDayCount, formatCurrency } from "@/lib/format";
import { CostPieChart } from "@/components/budget/cost-pie-chart";
import { CostByDayChart } from "@/components/budget/cost-by-day-chart";
import { CostByStopChart } from "@/components/budget/cost-by-stop-chart";

export const metadata = { title: "Budget" };

interface BudgetPageProps {
  params: Promise<{ id: string }>;
}

export default async function BudgetPage({ params }: BudgetPageProps) {
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
      totalBudget: true,
      startDate: true,
      endDate: true,
      stops: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          city: true,
          arrivalDay: true,
          departureDay: true,
          orderIndex: true,
          accomCostPerNight: true,
          dailyFoodEstimate: true,
          transportCost: true,
          activities: {
            where: { archived: false },
            select: { day: true, category: true, estimatedCost: true },
          },
        },
      },
    },
  });

  if (!trip) notFound();

  const totalDays = tripDayCount(trip.startDate, trip.endDate);
  const budget = computeBudget(trip.stops, totalDays, trip.totalBudget);
  const overBudget = budget.budget !== null && budget.total > budget.budget;
  const dailyAllowance =
    budget.budget && budget.budget > 0 ? budget.budget / totalDays : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm tracking-wide uppercase">
            Budget
          </p>
          <h1 className="font-display mt-2 text-3xl tracking-tight">
            Cost breakdown
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            Estimates roll up from each stop&apos;s accommodation, daily food,
            onward transport, and activity costs.
          </p>
        </div>
      </div>

      {overBudget ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive mt-6 flex items-start gap-3 rounded-md border px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Over budget by{" "}
              {formatCurrency(budget.total - (budget.budget ?? 0), trip.currency)}.
            </p>
            <p className="mt-0.5 text-xs opacity-90">
              Reduce activity spend, drop a night of accommodation, or raise
              the trip budget in trip settings.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="Total estimated"
          value={formatCurrency(budget.total, trip.currency)}
        />
        <KpiCard
          icon={CalendarDays}
          label="Per day"
          value={formatCurrency(budget.averagePerDay, trip.currency)}
        />
        <KpiCard
          icon={Coins}
          label="% of budget"
          value={
            budget.budget
              ? `${budget.pctOfBudget}%`
              : "No budget set"
          }
          tone={
            overBudget ? "destructive" : budget.pctOfBudget > 90 ? "warn" : "ok"
          }
        />
        <KpiCard
          icon={AlertCircle}
          label="Days over allowance"
          value={
            dailyAllowance ? `${budget.daysOverBudget} of ${totalDays}` : "—"
          }
          tone={budget.daysOverBudget > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        <Card className="border-border/70 shadow-none lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="font-display text-lg tracking-tight">By category</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Where the money goes.
            </p>
            <div className="mt-4">
              <CostPieChart data={budget.byCategory} currency={trip.currency} />
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-2 text-sm">
              {(Object.entries(budget.byCategory) as [
                keyof typeof budget.byCategory,
                number,
              ][]).map(([key, value]) => (
                <li
                  key={key}
                  className="text-muted-foreground flex items-baseline justify-between gap-2"
                >
                  <span className="capitalize">{key}</span>
                  <span className="text-foreground tabular-nums">
                    {formatCurrency(value, trip.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-none lg:col-span-3">
          <CardContent className="p-6">
            <h2 className="font-display text-lg tracking-tight">Per day</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              {dailyAllowance
                ? `Allowance ${formatCurrency(dailyAllowance, trip.currency)} per day`
                : "Set a total budget on the trip to see your daily allowance."}
            </p>
            <div className="mt-4">
              <CostByDayChart
                data={budget.byDay}
                currency={trip.currency}
                dailyAllowance={dailyAllowance}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 mt-6 shadow-none">
        <CardContent className="p-6">
          <h2 className="font-display text-lg tracking-tight">Per stop</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Accommodation, food, transport, and activities rolled together.
          </p>
          <div className="mt-4">
            <CostByStopChart data={budget.byStop} currency={trip.currency} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone = "ok",
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone?: "ok" | "warn" | "destructive";
}) {
  const accent =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground";
  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            {label}
          </p>
          <p
            className={`font-display mt-2 text-2xl tabular-nums tracking-tight ${accent}`}
          >
            {value}
          </p>
        </div>
        <div className="bg-accent text-accent-foreground rounded-md p-2">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
