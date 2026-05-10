// Next.js calls this once per server process (Node runtime only).
// We use it to start the in-process reminder cron.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startReminderCron } = await import("./src/lib/reminders/init");
  startReminderCron();
}
