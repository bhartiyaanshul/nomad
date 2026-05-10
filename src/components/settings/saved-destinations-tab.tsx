"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  addSavedDestinationAction,
  removeSavedDestinationAction,
} from "@/server/actions/saved-destinations";
import type { ActionResult } from "@/server/actions/result";

interface SavedDestinationsTabProps {
  destinations: Array<{
    id: string;
    city: string;
    country: string;
    notes: string | null;
  }>;
}

const initial: ActionResult<{ id: string }> | null = null;

export function SavedDestinationsTab({ destinations }: SavedDestinationsTabProps) {
  const [state, action] = useActionState(addSavedDestinationAction, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Destination saved");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="grid max-w-3xl gap-10 lg:grid-cols-5">
      <form
        ref={formRef}
        action={action}
        className="flex flex-col gap-5 lg:col-span-2"
      >
        <h3 className="font-display text-lg tracking-tight">
          Save a destination
        </h3>

        <Field id="city" label="City" required errors={fieldErrors?.city}>
          <Input id="city" name="city" required placeholder="Lisbon" />
        </Field>

        <Field
          id="country"
          label="Country"
          required
          errors={fieldErrors?.country}
        >
          <Input id="country" name="country" required placeholder="Portugal" />
        </Field>

        <Field id="notes" label="Notes" errors={fieldErrors?.notes}>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Why this place is on your list."
          />
        </Field>

        {state && !state.ok && !fieldErrors ? (
          <FormError message={state.error} />
        ) : null}

        <SubmitButton pendingLabel="Saving">Add to list</SubmitButton>
      </form>

      <div className="lg:col-span-3">
        <h3 className="font-display text-lg tracking-tight">
          Your saved destinations
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Pinned ideas for future trips.
        </p>

        {destinations.length === 0 ? (
          <div className="border-border/60 mt-6 rounded-md border border-dashed p-6 text-center">
            <p className="text-muted-foreground text-sm">
              No saved destinations yet.
            </p>
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {destinations.map((d) => (
              <SavedDestinationItem key={d.id} item={d} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SavedDestinationItem({
  item,
}: {
  item: { id: string; city: string; country: string; notes: string | null };
}) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="border-border/70 bg-card flex items-start justify-between gap-4 rounded-md border p-4">
      <div>
        <p className="text-sm font-medium">
          {item.city},{" "}
          <span className="text-muted-foreground">{item.country}</span>
        </p>
        {item.notes ? (
          <p className="text-muted-foreground mt-1 text-sm">{item.notes}</p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await removeSavedDestinationAction(item.id);
            toast.success("Removed");
          })
        }
        aria-label={`Remove ${item.city}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}
