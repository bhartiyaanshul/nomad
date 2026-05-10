"use client";

import { useTransition } from "react";
import { ListChecks } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { seedDefaultTodosAction } from "@/server/actions/todos";

interface SeedDefaultsButtonProps {
  tripId: string;
  hasExisting: boolean;
}

export function SeedDefaultsButton({
  tripId,
  hasExisting,
}: SeedDefaultsButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={hasExisting ? "ghost" : "outline"}
      size="sm"
      disabled={pending}
      className="gap-2"
      onClick={() =>
        startTransition(async () => {
          const result = await seedDefaultTodosAction(tripId);
          if (result.ok) {
            const { added, skipped } = result.data;
            if (added === 0) {
              toast.success(
                "Standard checklist already in place — nothing to add",
              );
            } else if (skipped > 0) {
              toast.success(
                `Added ${added} new prep todo${added === 1 ? "" : "s"} (${skipped} already existed)`,
              );
            } else {
              toast.success(
                `Added ${added} prep todo${added === 1 ? "" : "s"} with reminders`,
              );
            }
          } else {
            toast.error(result.error);
          }
        })
      }
    >
      <ListChecks className="size-4" />
      {pending ? "Adding" : "Add prep checklist"}
    </Button>
  );
}
