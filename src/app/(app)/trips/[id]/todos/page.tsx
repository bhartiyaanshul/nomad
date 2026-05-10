import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { AddTodoForm } from "@/components/todos/add-todo-form";
import { TodoItem } from "@/components/todos/todo-item";
import { SuggestTodosButton } from "@/components/todos/suggest-todos-button";
import { SeedDefaultsButton } from "@/components/todos/seed-defaults-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ListChecks } from "lucide-react";

export const metadata = { title: "Todos" };

interface TodosPageProps {
  params: Promise<{ id: string }>;
}

export default async function TodosPage({ params }: TodosPageProps) {
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
    select: { id: true },
  });
  if (!trip) notFound();

  const todos = await db.todo.findMany({
    where: { tripId: id, userId: session.user.id },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    include: { reminders: { select: { sent: true } } },
  });

  const grouped = todos.reduce<Record<string, typeof todos>>((acc, t) => {
    const key = t.status === "done" ? "Done" : "Pending";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm tracking-wide uppercase">
            Trip prep
          </p>
          <h1 className="font-display mt-2 text-3xl tracking-tight">
            Todos
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
            Standard prep todos (passport, visa, vaccinations, insurance,
            currency, online check-in) are seeded with auto-scheduled
            reminders. Use the AI button for destination-specific extras.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SeedDefaultsButton
            tripId={trip.id}
            hasExisting={todos.length > 0}
          />
          <SuggestTodosButton tripId={trip.id} />
        </div>
      </div>

      <Card className="border-border/70 mt-8 shadow-none">
        <CardContent className="p-6">
          <AddTodoForm tripId={trip.id} />
        </CardContent>
      </Card>

      <div className="mt-10 flex flex-col gap-8">
        {todos.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No todos yet"
            description="Add a task above, or let AI suggest the standard set for this kind of trip."
          />
        ) : null}

        {(["Pending", "Done"] as const).map((section) =>
          grouped[section] && grouped[section].length > 0 ? (
            <section key={section}>
              <h2 className="font-display border-border/60 mb-4 border-b pb-2 text-sm tracking-wide uppercase text-muted-foreground">
                {section} · {grouped[section].length}
              </h2>
              <ul className="flex flex-col gap-2">
                {grouped[section].map((t) => (
                  <TodoItem
                    key={t.id}
                    id={t.id}
                    content={t.content}
                    category={t.category}
                    priority={t.priority}
                    status={t.status}
                    dueAt={t.dueAt}
                    aiGenerated={t.aiGenerated}
                    aiSuggestedReason={t.aiSuggestedReason}
                    reminderCount={t.reminders.length}
                    sentReminders={t.reminders.filter((r) => r.sent).length}
                  />
                ))}
              </ul>
            </section>
          ) : null,
        )}
      </div>
    </div>
  );
}
