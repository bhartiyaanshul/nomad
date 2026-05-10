// Singleton wrapper that wires sweepReminders into a node-cron schedule
// at server start. Imported from instrumentation.ts. Idempotent.

import { schedule, type ScheduledTask } from "node-cron";

import { sweepReminders } from "./scheduler";

const globalForCron = globalThis as unknown as {
  traveloopCron?: ScheduledTask;
};

export function startReminderCron(): void {
  if (globalForCron.traveloopCron) return;
  const task = schedule(
    "*/5 * * * *",
    async () => {
      try {
        const n = await sweepReminders();
        if (n > 0) console.info(`[reminders] delivered ${n}`);
      } catch (err) {
        console.error("[reminders] sweep failed", err);
      }
    },
    { timezone: "UTC" },
  );
  globalForCron.traveloopCron = task;
  console.info("[reminders] cron started — every 5 minutes UTC");

  // Kick a sweep on boot so any past-due reminders get delivered without
  // waiting up to 5 minutes for the next tick.
  sweepReminders()
    .then((n) => {
      if (n > 0) console.info(`[reminders] initial sweep delivered ${n}`);
    })
    .catch((err) => console.error("[reminders] initial sweep failed", err));
}
