import { notFound, redirect } from "next/navigation";
import { NotebookPen } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { NoteForm } from "@/components/notes/note-form";
import { NoteCard } from "@/components/notes/note-card";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata = { title: "Notes" };

interface NotesPageProps {
  params: Promise<{ id: string }>;
}

export default async function NotesPage({ params }: NotesPageProps) {
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
      stops: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          city: true,
          arrivalDay: true,
          departureDay: true,
        },
      },
    },
  });
  if (!trip) notFound();

  const notes = await db.note.findMany({
    where: { tripId: id },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { name: true } },
      stop: { select: { city: true, country: true } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div>
        <p className="text-muted-foreground text-sm tracking-wide uppercase">
          Trip journal
        </p>
        <h1 className="font-display mt-2 text-3xl tracking-tight">Notes</h1>
        <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
          Markdown notes scoped to the trip or any single stop. Pin the ones
          you want at the top.
        </p>
      </div>

      <Card className="border-border/70 mt-8 shadow-none">
        <CardContent className="p-6">
          <NoteForm tripId={trip.id} stops={trip.stops} />
        </CardContent>
      </Card>

      <div className="mt-10 flex flex-col gap-4">
        {notes.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title="No notes yet"
            description="Capture restaurant ideas, tips from friends, or anything you don't want to forget."
          />
        ) : (
          notes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              isAuthor={session.user.id === n.authorId}
            />
          ))
        )}
      </div>
    </div>
  );
}
