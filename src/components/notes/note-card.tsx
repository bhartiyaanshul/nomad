"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { MapPin, Pin, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarkdownRender } from "@/components/notes/markdown-render";
import {
  deleteNoteAction,
  togglePinNoteAction,
} from "@/server/actions/notes";
import { cn } from "@/lib/utils";

interface NoteCardProps {
  note: {
    id: string;
    title: string | null;
    content: string;
    pinned: boolean;
    createdAt: Date;
    updatedAt: Date;
    day: number | null;
    stop: { city: string; country: string } | null;
    author: { name: string };
  };
  isAuthor: boolean;
}

export function NoteCard({ note, isAuthor }: NoteCardProps) {
  const [pending, startTransition] = useTransition();
  return (
    <article
      className={cn(
        "border-border/70 bg-card rounded-md border p-5",
        note.pinned && "border-primary/40 bg-primary/[0.03]",
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {note.title ? (
              <h3 className="font-display text-base tracking-tight">
                {note.title}
              </h3>
            ) : null}
            {note.pinned ? (
              <Badge variant="secondary" className="text-[10px]">
                Pinned
              </Badge>
            ) : null}
            {note.stop ? (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <MapPin className="size-3" />
                {note.stop.city}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {note.author.name} · {format(note.createdAt, "d MMM yyyy")}
            {note.updatedAt.getTime() !== note.createdAt.getTime()
              ? " (edited)"
              : ""}
          </p>
        </div>
        {isAuthor ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-label={note.pinned ? "Unpin" : "Pin"}
              onClick={() =>
                startTransition(async () => {
                  await togglePinNoteAction(note.id);
                })
              }
            >
              <Pin
                className={cn(
                  "size-4",
                  note.pinned && "fill-current",
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-label="Delete note"
              onClick={() =>
                startTransition(async () => {
                  await deleteNoteAction(note.id);
                  toast.success("Removed");
                })
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : null}
      </header>
      <MarkdownRender source={note.content} />
    </article>
  );
}
