// Default trip preparation checklist. Seeded on trip creation, and also
// available behind a "Add prep checklist" button on the /todos page.
// Each entry has a `daysBefore` offset; the actual dueAt is computed from
// the trip's startDate. Reminders are auto-scheduled by addTodo from the
// priority preset (high: T-7d/3d/1d/2h, normal: T-3d/1d, low: T-1d).

export type TodoPriority = "high" | "normal" | "low";
export type TodoCategory =
  | "documents"
  | "health"
  | "finance"
  | "packing"
  | "booking"
  | "logistics"
  | "communication";

export interface DefaultTodo {
  content: string;
  category: TodoCategory;
  priority: TodoPriority;
  daysBefore: number;
  reason: string;
  /** Skip this todo for domestic trips (no border crossing). */
  internationalOnly?: boolean;
}

export const DEFAULT_TRIP_TODOS: DefaultTodo[] = [
  // ─── Documents ──────────────────────────────────────────────────────
  {
    content: "Verify passport validity (6+ months past return date)",
    category: "documents",
    priority: "high",
    daysBefore: 60,
    reason:
      "Most countries require six months of validity past your return date — renewals can take weeks, so check now.",
    internationalOnly: true,
  },
  {
    content: "Apply for visa if required",
    category: "documents",
    priority: "high",
    daysBefore: 45,
    reason:
      "Visa-on-arrival, e-visa, and embassy visas have different lead times — confirm early.",
    internationalOnly: true,
  },
  {
    content: "Photocopy / scan passport, visa, and ID",
    category: "documents",
    priority: "normal",
    daysBefore: 14,
    reason:
      "Keep a digital copy in cloud storage and a printed copy separate from your passport.",
    internationalOnly: true,
  },

  // ─── Health ─────────────────────────────────────────────────────────
  {
    content: "Schedule vaccinations and routine check-up",
    category: "health",
    priority: "high",
    daysBefore: 30,
    reason:
      "Some vaccines need 4+ weeks to take effect. Book a travel-clinic visit early.",
    internationalOnly: true,
  },
  {
    content: "Refill prescriptions (with extra for delays)",
    category: "health",
    priority: "high",
    daysBefore: 14,
    reason:
      "Carry meds in original containers in your hand luggage — bring 1–2 weeks extra.",
  },
  {
    content: "Buy travel insurance",
    category: "finance",
    priority: "high",
    daysBefore: 21,
    reason:
      "Covers medical emergencies, trip cancellation, and lost luggage. Cheaper the earlier you buy.",
  },

  // ─── Finance ────────────────────────────────────────────────────────
  {
    content: "Notify bank of travel dates and destinations",
    category: "finance",
    priority: "normal",
    daysBefore: 7,
    reason:
      "Avoid your debit/credit card being frozen for suspicious-looking foreign charges.",
  },
  {
    content: "Exchange currency or get travel-friendly card",
    category: "finance",
    priority: "normal",
    daysBefore: 7,
    reason:
      "Carry a small amount of cash for arrival; use a no-foreign-fee card for the rest.",
  },

  // ─── Booking & logistics ────────────────────────────────────────────
  {
    content: "Confirm all flight bookings and seat selections",
    category: "booking",
    priority: "normal",
    daysBefore: 14,
    reason:
      "Re-check times, seat choices, and meal options — airlines occasionally reschedule.",
  },
  {
    content: "Book airport transfer or research transit",
    category: "logistics",
    priority: "normal",
    daysBefore: 7,
    reason:
      "Pre-book a transfer or save the public-transit route, especially for late-night arrivals.",
  },
  {
    content: "Set up international roaming or buy local SIM / eSIM",
    category: "communication",
    priority: "normal",
    daysBefore: 5,
    reason:
      "Compare your carrier's roaming pack vs. an eSIM (Airalo, Holafly) before you leave.",
  },
  {
    content: "Print or download all booking confirmations",
    category: "booking",
    priority: "normal",
    daysBefore: 3,
    reason:
      "Hotels, transfers, attractions — keep them offline-accessible in case of no signal.",
  },
  {
    content: "Download offline maps and translation apps",
    category: "logistics",
    priority: "low",
    daysBefore: 3,
    reason:
      "Google Maps offline, Maps.me, or your preferred translation app for the local language.",
  },

  // ─── Packing & departure ────────────────────────────────────────────
  {
    content: "Pack and weigh checked + carry-on luggage",
    category: "packing",
    priority: "normal",
    daysBefore: 2,
    reason:
      "Avoid overweight fees by checking your airline's limits and weighing at home.",
  },
  {
    content: "Online check-in 24h before flight",
    category: "booking",
    priority: "high",
    daysBefore: 1,
    reason:
      "Most airlines open check-in 24h ahead. Saves time and locks in your seat.",
  },
  {
    content: "Arrange home (mail hold, pet care, plant watering)",
    category: "logistics",
    priority: "low",
    daysBefore: 3,
    reason:
      "Pause subscriptions, set out-of-office, and confirm anyone watching the place.",
  },
];

export interface SeedDefaultTodosArgs {
  tripStart: Date;
  isInternational: boolean;
  /** Now() for tests; defaults to new Date(). */
  now?: Date;
}

export interface ResolvedTodo {
  content: string;
  category: TodoCategory;
  priority: TodoPriority;
  reason: string;
  /** Absolute due date; clamped so it's never in the past. */
  dueAt: Date;
}

/**
 * Resolve the default checklist into concrete todos with absolute due dates.
 * Skips internationalOnly entries for domestic trips. Clamps due dates to
 * at least one hour from now so the cron sweeper picks up reminders for
 * trips starting very soon.
 */
export function resolveDefaultTodos(
  args: SeedDefaultTodosArgs,
): ResolvedTodo[] {
  const now = args.now ?? new Date();
  const minDue = new Date(now.getTime() + 60 * 60 * 1000); // +1h floor

  return DEFAULT_TRIP_TODOS.filter(
    (t) => args.isInternational || !t.internationalOnly,
  ).map((t) => {
    const naturalDue = new Date(args.tripStart);
    naturalDue.setDate(naturalDue.getDate() - t.daysBefore);
    const dueAt = naturalDue.getTime() < minDue.getTime() ? minDue : naturalDue;
    return {
      content: t.content,
      category: t.category,
      priority: t.priority,
      reason: t.reason,
      dueAt,
    };
  });
}
