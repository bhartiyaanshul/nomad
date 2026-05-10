import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Compass,
  Plus,
  Sparkles,
  Wallet,
  Map as MapIcon,
} from "lucide-react";
import { isBefore } from "date-fns";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TripCard } from "@/components/trip/trip-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonalityQuiz } from "@/components/onboarding/personality-quiz";
import { AIGenerateDialog } from "@/components/ai/ai-generate-dialog";
import { AIStatusBanner } from "@/components/ai/ai-status-banner";
import { formatCurrency } from "@/lib/format";
import featuredCities from "../../../../public/seed/featured-cities.json";

export const metadata = { title: "Dashboard" };

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

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [user, upcomingTrips, totalBudgetAgg] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, personality: true, currency: true },
    }),
    db.trip.findMany({
      where: { ownerId: userId, endDate: { gte: new Date() } },
      include: { _count: { select: { stops: true, members: true } } },
      orderBy: { startDate: "asc" },
      take: 3,
    }),
    db.trip.aggregate({
      where: { ownerId: userId, endDate: { gte: new Date() } },
      _sum: { totalBudget: true },
      _count: true,
    }),
  ]);

  if (!user) redirect("/login");

  const showQuiz = user.personality === null;
  const firstName = user.name.split(" ")[0];
  const upcoming = upcomingTrips.filter((t) =>
    isBefore(new Date(), t.endDate),
  );

  const plannedSpend = totalBudgetAgg._sum.totalBudget ?? 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm tracking-wide uppercase">
            Welcome back
          </p>
          <h1 className="font-display mt-2 text-3xl tracking-tight">
            Hello, {firstName}
          </h1>
          {user.personality ? (
            <p className="text-muted-foreground mt-2 text-sm">
              Planning in{" "}
              <span className="text-foreground font-medium">
                {PERSONALITY_LABELS[user.personality] ?? "Mixed"}
              </span>{" "}
              mode.{" "}
              <Link
                href="/settings"
                className="hover:text-foreground underline-offset-4 hover:underline"
              >
                Change
              </Link>
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/trips">
              <MapIcon className="size-4" />
              All trips
            </Link>
          </Button>
          <AIGenerateDialog
            defaultPersonality={user.personality}
            defaultCurrency={user.currency}
            trigger={
              <Button variant="outline" className="gap-2">
                <Sparkles className="size-4" />
                Plan with AI
              </Button>
            }
          />
          <Button asChild className="gap-2">
            <Link href="/trips/new">
              <Plus className="size-4" />
              Plan a new trip
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <AIStatusBanner />
      </div>

      <section className="mt-12">
        <SectionHeader
          kicker="Upcoming"
          title="Trips on the horizon"
          action={
            upcoming.length > 0 ? (
              <Button asChild variant="ghost" size="sm" className="gap-1">
                <Link href="/trips?status=upcoming">
                  See all
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            ) : null
          }
        />
        <div className="mt-6">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="Nothing on the calendar yet"
              description="Start with a manual draft, or in Phase 3 the AI generator will plan a multi-city trip from a few sentences."
              action={
                <Button asChild>
                  <Link href="/trips/new">Plan a new trip</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        <KpiCard
          icon={MapIcon}
          label="Active trips"
          value={`${totalBudgetAgg._count ?? 0}`}
        />
        <KpiCard
          icon={Wallet}
          label="Planned spend"
          value={
            plannedSpend > 0
              ? formatCurrency(plannedSpend, user.currency)
              : "Not set"
          }
        />
        <KpiCard
          icon={Sparkles}
          label="AI itinerary"
          value="Plan in seconds"
        />
      </div>

      <section className="mt-14">
        <SectionHeader
          kicker="Discover"
          title="Cities to consider"
        />
        <div className="mt-6 grid gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
          {featuredCities.map((c) => (
            <article
              key={`${c.city}-${c.country}`}
              className="bg-card flex flex-col gap-2 p-6"
            >
              <p className="text-muted-foreground text-xs tracking-wider uppercase">
                {PERSONALITY_LABELS[c.personality] ?? c.personality}
              </p>
              <h3 className="font-display text-lg leading-tight tracking-tight">
                {c.city}
                <span className="text-muted-foreground">, {c.country}</span>
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {c.tagline}
              </p>
            </article>
          ))}
        </div>
      </section>

      {showQuiz ? <PersonalityQuiz open /> : null}
    </div>
  );
}

function SectionHeader({
  kicker,
  title,
  action,
}: {
  kicker: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-2 border-b border-border/60 pb-3">
      <div>
        <p className="text-muted-foreground text-xs tracking-wider uppercase">
          {kicker}
        </p>
        <h2 className="font-display mt-1 text-xl tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Compass;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            {label}
          </p>
          <p className="font-display mt-2 text-2xl tracking-tight">{value}</p>
        </div>
        <div className="bg-accent text-accent-foreground rounded-md p-2">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
