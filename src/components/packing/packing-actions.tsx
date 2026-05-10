"use client";

import { useTransition } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  resetPackingAction,
  suggestPackingAction,
} from "@/server/actions/packing";

export function PackingActions({ tripId }: { tripId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        className="gap-2"
        onClick={() =>
          startTransition(async () => {
            const result = await suggestPackingAction(tripId);
            if (result.ok)
              toast.success(
                result.data.added > 0
                  ? `Added ${result.data.added} items`
                  : "Nothing new to add",
              );
            else toast.error(result.error);
          })
        }
      >
        <Sparkles className="size-4" />
        Generate with AI
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        className="gap-2"
        onClick={() =>
          startTransition(async () => {
            await resetPackingAction(tripId);
            toast.success("Reset all to unpacked");
          })
        }
      >
        <RotateCcw className="size-4" />
        Reset
      </Button>
    </div>
  );
}
