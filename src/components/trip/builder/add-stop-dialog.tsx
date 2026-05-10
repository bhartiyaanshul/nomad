"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { createStopAction } from "@/server/actions/stops";
import type { ActionResult } from "@/server/actions/result";
import { ACCOM_TYPES, TRANSPORT_MODES } from "@/lib/validation/trip";

interface AddStopDialogProps {
  tripId: string;
  totalDays: number;
  defaultStartDay: number;
}

const initial: ActionResult<{ stopId: string }> | null = null;

export function AddStopDialog({
  tripId,
  totalDays,
  defaultStartDay,
}: AddStopDialogProps) {
  const [open, setOpen] = useState(false);
  const action = createStopAction.bind(null, tripId);
  const [state, formAction] = useActionState(action, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.ok) {
      toast.success("Stop added");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- close after server action
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full justify-center gap-2">
          <Plus className="size-4" />
          Add a stop
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-tight">
            Add a stop
          </DialogTitle>
          <DialogDescription>
            City, dates, accommodation, and onward transport. You can leave
            anything blank for now.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="add-city"
              label="City"
              required
              errors={fieldErrors?.city}
            >
              <Input id="add-city" name="city" required placeholder="Hanoi" />
            </Field>
            <Field
              id="add-country"
              label="Country"
              required
              errors={fieldErrors?.country}
            >
              <Input
                id="add-country"
                name="country"
                required
                placeholder="Vietnam"
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="add-arrivalDay"
              label="Arrival day"
              hint={`1 to ${totalDays}`}
              required
              errors={fieldErrors?.arrivalDay}
            >
              <Input
                id="add-arrivalDay"
                name="arrivalDay"
                type="number"
                min={1}
                max={totalDays}
                defaultValue={defaultStartDay}
                required
              />
            </Field>
            <Field
              id="add-departureDay"
              label="Departure day"
              hint={`Up to ${totalDays}`}
              required
              errors={fieldErrors?.departureDay}
            >
              <Input
                id="add-departureDay"
                name="departureDay"
                type="number"
                min={1}
                max={totalDays}
                defaultValue={Math.min(totalDays, defaultStartDay + 1)}
                required
              />
            </Field>
          </div>

          <Field id="add-summary" label="Summary" errors={fieldErrors?.summary}>
            <Textarea
              id="add-summary"
              name="summary"
              rows={2}
              maxLength={280}
              placeholder="Optional: a one-line description of this leg."
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="add-accomName"
              label="Accommodation"
              errors={fieldErrors?.accomName}
            >
              <Input
                id="add-accomName"
                name="accomName"
                placeholder="Old Quarter Hostel"
              />
            </Field>
            <Field
              id="add-accomType"
              label="Type"
              errors={fieldErrors?.accomType}
            >
              <Select name="accomType">
                <SelectTrigger id="add-accomType">
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field
              id="add-accomCostPerNight"
              label="Per night"
              errors={fieldErrors?.accomCostPerNight}
            >
              <Input
                id="add-accomCostPerNight"
                name="accomCostPerNight"
                type="number"
                min={0}
                step={1}
              />
            </Field>
            <Field
              id="add-dailyFoodEstimate"
              label="Daily food"
              errors={fieldErrors?.dailyFoodEstimate}
            >
              <Input
                id="add-dailyFoodEstimate"
                name="dailyFoodEstimate"
                type="number"
                min={0}
                step={1}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field
              id="add-transportMode"
              label="Transport to next"
              errors={fieldErrors?.transportMode}
            >
              <Select name="transportMode">
                <SelectTrigger id="add-transportMode">
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPORT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="add-transportCost"
              label="Cost"
              errors={fieldErrors?.transportCost}
            >
              <Input
                id="add-transportCost"
                name="transportCost"
                type="number"
                min={0}
                step={1}
              />
            </Field>
            <Field
              id="add-transportHours"
              label="Hours"
              errors={fieldErrors?.transportHours}
            >
              <Input
                id="add-transportHours"
                name="transportHours"
                type="number"
                min={0}
                step={0.5}
              />
            </Field>
          </div>

          {state && !state.ok && !fieldErrors ? (
            <FormError message={state.error} />
          ) : null}

          <DialogFooter className="gap-2 sm:gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Adding">Add stop</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
