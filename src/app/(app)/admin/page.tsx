import { redirect } from "next/navigation";
import {
  Activity,
  CalendarDays,
  Users,
  Sparkles,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import {
  loadOverview,
  loadRetentionCohort,
  loadTopDestinations,
  loadTripsOverTime,
  loadUsers,
} from "@/server/admin";
import { TripsLineChart } from "@/components/admin/trips-line-chart";
import { DestinationsBarChart } from "@/components/admin/destinations-bar-chart";
import { UsersTable } from "@/components/admin/users-table";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin" };

interface AdminPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.isAdmin) redirect("/dashboard");

  const { q = "" } = await searchParams;

  const [overview, line, top, retention, users] = await Promise.all([
    loadOverview(),
    loadTripsOverTime(),
    loadTopDestinations(),
    loadRetentionCohort(),
    loadUsers(q),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div>
        <p className="text-muted-foreground text-sm tracking-wide uppercase">
          Admin
        </p>
        <h1 className="font-display mt-2 text-3xl tracking-tight">
          Operations
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
          Aggregated KPIs, retention, and user management. Numbers refresh
          every minute.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Total users"
          value={overview.totalUsers}
          icon={Users}
        />
        <Kpi label="Total trips" value={overview.totalTrips} icon={CalendarDays} />
        <Kpi
          label="AI generations (24h)"
          value={overview.aiGenerationsLast24h}
          icon={Sparkles}
        />
        <Kpi
          label="Trips created (7d)"
          value={overview.tripsCreatedLast7d}
          icon={Activity}
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 shadow-none">
          <CardContent className="p-6">
            <h2 className="font-display text-lg tracking-tight">
              Trips over time
            </h2>
            <p className="text-muted-foreground mt-1 mb-4 text-xs">
              Daily, last 30 days.
            </p>
            <TripsLineChart data={line} />
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-none">
          <CardContent className="p-6">
            <h2 className="font-display text-lg tracking-tight">
              Top destinations
            </h2>
            <p className="text-muted-foreground mt-1 mb-4 text-xs">
              By number of stops, top 10.
            </p>
            <DestinationsBarChart data={top} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 mt-6 shadow-none">
        <CardContent className="p-6">
          <h2 className="font-display text-lg tracking-tight">
            Retention
          </h2>
          <p className="text-muted-foreground mt-1 mb-4 text-xs">
            Weekly cohorts: how many of each week&apos;s new users return in
            subsequent weeks. Dimmed cells are sparser.
          </p>
          <div className="overflow-x-auto">
            <table className="text-xs tabular-nums">
              <tbody>
                {retention.map((r) => (
                  <tr key={r.cohort}>
                    <td className="text-muted-foreground py-1 pr-4">
                      {r.cohort}
                    </td>
                    {r.sizes.map((n, i) => {
                      const max = r.sizes[0] || 1;
                      const opacity = i === 0 ? 1 : Math.max(0.18, n / max);
                      return (
                        <td key={i} className="px-1 py-1">
                          <div
                            className={cn(
                              "bg-primary/10 text-foreground flex size-10 items-center justify-center rounded",
                            )}
                            style={{ opacity }}
                          >
                            {n}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 mt-6 shadow-none">
        <CardContent className="p-6">
          <h2 className="font-display text-lg tracking-tight">
            Users
          </h2>
          <p className="text-muted-foreground mt-1 mb-4 text-xs">
            Promote to admin, ban, or export the table to CSV.
          </p>
          <UsersTable rows={users} currentUserId={session.user.id} />
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            {label}
          </p>
          <p className="font-display mt-2 text-3xl tabular-nums tracking-tight">
            {value.toLocaleString()}
          </p>
        </div>
        <div className="bg-accent text-accent-foreground rounded-md p-2">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
