"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  applySuggestedTodoAction,
  suggestTodosAction,
  type SuggestedTodo,
} from "@/server/actions/todos";

interface SuggestTodosButtonProps {
  tripId: string;
}

export function SuggestTodosButton({ tripId }: SuggestTodosButtonProps) {
  const [open, setOpen] = useState(false);
  const [todos, setTodos] = useState<SuggestedTodo[] | null>(null);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState<number | null>(null);

  function fetchSuggestions() {
    setTodos(null);
    setSkipped(new Set());
    startTransition(async () => {
      const result = await suggestTodosAction(tripId);
      if (result.ok) {
        setTodos(result.data.todos);
      } else {
        toast.error(result.error);
        setOpen(false);
      }
    });
  }

  function add(todo: SuggestedTodo, idx: number) {
    setAdding(idx);
    startTransition(async () => {
      const result = await applySuggestedTodoAction({ tripId, todo });
      setAdding(null);
      if (result.ok) {
        toast.success("Added to your todos");
        setSkipped((s) => new Set(s).add(idx));
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) fetchSuggestions();
        else setTodos(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="size-4" />
          Suggest with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-tight">
            Trip preparation todos
          </DialogTitle>
          <DialogDescription>
            Tailored to your destinations, length, and group size. Add the ones
            that apply; skip the rest.
          </DialogDescription>
        </DialogHeader>

        {!todos ? (
          <ul className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-20 w-full rounded-md" />
              </li>
            ))}
          </ul>
        ) : todos.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No suggestions for this trip.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todos.map((t, i) => {
              const isSkipped = skipped.has(i);
              return (
                <li
                  key={i}
                  className="border-border/70 bg-card flex items-start gap-3 rounded-md border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium">{t.content}</p>
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize"
                      >
                        {t.priority}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {t.reason}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Due {t.days_before_trip}d before · {t.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSkipped ? (
                      <span className="text-muted-foreground text-xs">
                        Added
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending && adding === i}
                        onClick={() => add(t, i)}
                      >
                        {pending && adding === i ? "Adding" : "Add"}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
