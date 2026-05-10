// In-process reminder sweeper. Runs every 5 minutes via node-cron, looks
// for due Reminder rows that haven't been sent, delivers via the configured
// channel (in-app Notification row + optional email via Resend), and marks
// them sent. Safe to call directly for dev/testing.

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const BATCH_SIZE = 50;

export async function sweepReminders(): Promise<number> {
  const now = new Date();
  const due = await db.reminder.findMany({
    where: { sent: false, scheduledAt: { lte: now } },
    take: BATCH_SIZE,
    include: {
      todo: {
        include: {
          trip: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (due.length === 0) return 0;

  let delivered = 0;
  for (const r of due) {
    try {
      const link = `/trips/${r.todo.trip.id}/todos`;
      const title = `Reminder: ${r.todo.content}`;
      const body =
        r.todo.aiSuggestedReason ??
        `Due ${r.todo.dueAt.toLocaleDateString()} for "${r.todo.trip.name}".`;

      // In-app notification
      await db.notification.create({
        data: {
          userId: r.todo.user.id,
          title,
          body,
          link,
        },
      });

      // Email — only if Resend is configured (sendEmail logs to console
      // otherwise so dev still sees something).
      if (r.channel === "email" && r.todo.user.email) {
        try {
          await sendEmail({
            to: r.todo.user.email,
            subject: title,
            text: body,
          });
        } catch (err) {
          console.warn("[reminders] email failed", err);
        }
      }

      await db.reminder.update({
        where: { id: r.id },
        data: { sent: true, sentAt: new Date() },
      });
      delivered++;
    } catch (err) {
      console.error("[reminders] failed to deliver", r.id, err);
    }
  }
  return delivered;
}
