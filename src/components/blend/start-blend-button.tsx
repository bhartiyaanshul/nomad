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
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { startBlendAction } from "@/server/actions/blend";

export function StartBlendButton({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="size-4" />
          Start Trip Blend
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg tracking-tight">
            Start a Trip Blend
          </DialogTitle>
          <DialogDescription>
            Members propose places, vote, and the AI re-blends a group
            itinerary in real time. Set an optional voting deadline.
          </DialogDescription>
        </DialogHeader>
        <Field id="blend-deadline" label="Voting deadline (optional)">
          <Input
            id="blend-deadline"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await startBlendAction(
                  tripId,
                  deadline || undefined,
                );
                if (result.ok) {
                  setOpen(false);
                  toast.success("Trip Blend room is open");
                } else {
                  toast.error(result.error);
                }
              })
            }
          >
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
