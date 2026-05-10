// Server-side admin queries. Cached for 60s in module scope to keep the
// admin dashboard responsive without re-running heavy aggregations on
// every request.

import { db } from "@/lib/db";

interface CacheEntry<T> {
  value: T;
  fetchedAt: number;
}

const TTL_MS = 60_000;
const cache: Record<string, CacheEntry<unknown>> = {};

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = cache[key];
  if (hit && Date.now() - hit.fetchedAt < TTL_MS) return hit.value as T;
  const value = await loader();
  cache[key] = { value, fetchedAt: Date.now() };
  return value;
}

export interface AdminOverview {
  totalUsers: number;
  totalTrips: number;
  aiGenerationsLast24h: number;
  tripsCreatedLast7d: number;
}

export async function loadOverview(): Promise<AdminOverview> {
  return cached("overview", async () => {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [totalUsers, totalTrips, aiCount, tripCount] = await Promise.all([
      db.user.count(),
      db.trip.count(),
      db.userEvent.count({
        where: {
          eventType: "ai_itinerary_generated",
          createdAt: { gte: since24h },
        },
      }),
      db.trip.count({ where: { createdAt: { gte: since7d } } }),
    ]);
    return {
      totalUsers,
      totalTrips,
      aiGenerationsLast24h: aiCount,
      tripsCreatedLast7d: tripCount,
    };
  });
}

export async function loadTripsOverTime(): Promise<
  Array<{ date: string; count: number }>
> {
  return cached("tripsOverTime", async () => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trips = await db.trip.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });
    const byDay = new Map<string, number>();
    for (let i = 30; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      byDay.set(d.toISOString().slice(0, 10), 0);
    }
    for (const t of trips) {
      const k = t.createdAt.toISOString().slice(0, 10);
      byDay.set(k, (byDay.get(k) ?? 0) + 1);
    }
    return Array.from(byDay.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  });
}

export async function loadTopDestinations(): Promise<
  Array<{ city: string; count: number }>
> {
  return cached("topDestinations", async () => {
    const grouped = await db.stop.groupBy({
      by: ["city"],
      _count: { city: true },
      orderBy: { _count: { city: "desc" } },
      take: 10,
    });
    return grouped.map((g) => ({ city: g.city, count: g._count.city }));
  });
}

export async function loadRetentionCohort(): Promise<
  Array<{ cohort: string; sizes: number[] }>
> {
  return cached("retention", async () => {
    // 6 weekly cohorts going back 6 weeks. For each cohort, count active
    // users (any UserEvent or trip created) in each subsequent week.
    const cohorts: Array<{ cohort: string; sizes: number[] }> = [];
    const now = new Date();
    for (let cw = 6; cw > 0; cw--) {
      const cohortStart = new Date(now);
      cohortStart.setDate(cohortStart.getDate() - cw * 7);
      const cohortEnd = new Date(cohortStart);
      cohortEnd.setDate(cohortStart.getDate() + 7);

      const cohortUsers = await db.user.findMany({
        where: { createdAt: { gte: cohortStart, lt: cohortEnd } },
        select: { id: true },
      });
      const ids = new Set(cohortUsers.map((u) => u.id));
      const sizes: number[] = [ids.size];

      for (let w = 1; w < cw; w++) {
        const ws = new Date(cohortStart);
        ws.setDate(cohortStart.getDate() + w * 7);
        const we = new Date(ws);
        we.setDate(ws.getDate() + 7);

        const active = await db.userEvent.findMany({
          where: {
            userId: { in: Array.from(ids) },
            createdAt: { gte: ws, lt: we },
          },
          distinct: ["userId"],
          select: { userId: true },
        });
        sizes.push(active.length);
      }

      cohorts.push({
        cohort: `Week of ${cohortStart.toISOString().slice(0, 10)}`,
        sizes,
      });
    }
    return cohorts;
  });
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  banned: boolean;
  createdAt: Date;
  tripCount: number;
}

export async function loadUsers(query: string): Promise<AdminUserRow[]> {
  const users = await db.user.findMany({
    where: query
      ? {
          OR: [
            { email: { contains: query.toLowerCase() } },
            { name: { contains: query } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      banned: true,
      createdAt: true,
      _count: { select: { trips: true } },
    },
  });
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    isAdmin: u.isAdmin,
    banned: u.banned,
    createdAt: u.createdAt,
    tripCount: u._count.trips,
  }));
}
