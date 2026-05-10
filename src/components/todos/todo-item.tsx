"use client";

import { useTransition } from "react";
import { format, isPast } from "date-fns";
import { Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  deleteTodoAction,
  toggleTodoStatusAction,
} from "@/server/actions/todos";

interface TodoItemProps {
  id: string;
  content: string;
  category: string | null;
  priority: string;
  status: string;
  dueAt: Date;
  aiGenerated: boolean;
  aiSuggestedReason: string | null;
  reminderCount: number;
  sentReminders: number;
}

const PRIORITY_TONE: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  normal: "bg-accent text-accent-foreground",
  low: "bg-muted text-muted-foreground",
};

export function TodoItem(props: TodoItemProps) {
  const [pending, startTransition] = useTransition();
  const isDone = props.status === "done";
  const overdue = !isDone && isPast(props.dueAt);

  return (
    <li
      className={cn(
        "border-border/70 bg-card flex items-start gap-3 rounded-md border p-4",
        isDone && "opacity-60",
      )}
    >
      <Checkbox
        checked={isDone}
        onCheckedChange={() =>
          startTransition(async () => {
            await toggleTodoStatusAction(props.id);
          })
        }
        disabled={pending}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p
            className={cn(
              "text-sm font-medium",
              isDone && "line-through",
            )}
          >
            {props.content}
          </p>
          <Badge
            className={cn(
              "text-[10px] capitalize",
              PRIORITY_TONE[props.priority] ?? PRIORITY_TONE.normal,
            )}
          >
            {props.priority}
          </Badge>
        </div>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span
            className={cn(
              "tabular-nums",
              overdue && "text-destructive font-medium",
            )}
          >
            Due {format(props.dueAt, "d MMM yyyy, HH:mm")}
            {overdue ? " · overdue" : ""}
          </span>
          {props.category ? (
            <span className="capitalize">· {props.category}</span>
          ) : null}
          <span>
            ·{" "}
            {props.sentReminders}/{props.reminderCount} reminders sent
          </span>
          {props.aiGenerated ? (
            <span className="text-primary inline-flex items-center gap-1">
              <Sparkles className="size-3" />
              AI suggested
            </span>
          ) : null}
        </div>
        {props.aiGenerated && props.aiSuggestedReason ? (
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed italic">
            {props.aiSuggestedReason}
          </p>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        aria-label="Delete todo"
        onClick={() =>
          startTransition(async () => {
            await deleteTodoAction(props.id);
            toast.success("Removed");
          })
        }
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}
