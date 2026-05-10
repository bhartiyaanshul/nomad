"use client";

import { useActionState, useEffect, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ACCOM_TYPES, TRANSPORT_MODES } from "@/lib/validation/trip";
import { deleteStopAction, updateStopAction } from "@/server/actions/stops";
import type { ActionResult } from "@/server/actions/result";

import type { BuilderStop } from "./types";
import { ActivitiesPanel } from "./activities-panel";

interface StopEditorProps {
  stop: BuilderStop;
  totalDays: number;
  isLast: boolean;
  currency: string;
}

const initial: ActionResult<{ updated: true }> | null = null;

export function StopEditor({ stop, totalDays, isLast, currency }: StopEditorProps) {
  const action = updateStopAction.bind(null, stop.id);
  const [state, formAction] = useActionState(action, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const [deletePending, startDelete] = useTransition();

  useEffect(() => {
    if (state?.ok) toast.success("Stop saved");
  }, [state]);

  return (
    <div className="flex flex-col gap-8">
      <form
        action={formAction}
        className="flex flex-col gap-5"
        key={stop.id}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="city"
            label="City"
            required
            errors={fieldErrors?.city}
          >
            <Input
              id="city"
              name="city"
              defaultValue={stop.city}
              required
            />
          </Field>
          <Field
            id="country"
            label="Country"
            required
            errors={fieldErrors?.country}
          >
            <Input
              id="country"
              name="country"
              defaultValue={stop.country}
              required
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="arrivalDay"
            label="Arrival day"
            hint={`1 to ${totalDays}`}
            errors={fieldErrors?.arrivalDay}
          >
            <Input
              id="arrivalDay"
              name="arrivalDay"
              type="number"
              min={1}
              max={totalDays}
              defaultValue={stop.arrivalDay}
            />
          </Field>
          <Field
            id="departureDay"
            label="Departure day"
            hint={`Up to ${totalDays}`}
            errors={fieldErrors?.departureDay}
          >
            <Input
              id="departureDay"
              name="departureDay"
              type="number"
              min={1}
              max={totalDays}
              defaultValue={stop.departureDay}
            />
          </Field>
        </div>

        <Field id="summary" label="Summary" errors={fieldErrors?.summary}>
          <Textarea
            id="summary"
            name="summary"
            rows={2}
            maxLength={280}
            defaultValue={stop.summary ?? ""}
          />
        </Field>

        <div className="border-border/60 border-t pt-5">
          <h3 className="font-display text-base tracking-tight">
            Accommodation
          </h3>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            <Field
              id="accomName"
              label="Name"
              errors={fieldErrors?.accomName}
              className="sm:col-span-2"
            >
              <Input
                id="accomName"
                name="accomName"
                defaultValue={stop.accomName ?? ""}
              />
            </Field>
            <Field
              id="accomType"
              label="Type"
              errors={fieldErrors?.accomType}
            >
              <Select
                name="accomType"
                defaultValue={stop.accomType ?? undefined}
              >
                <SelectTrigger id="accomType">
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
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Field
              id="accomCostPerNight"
              label="Per night"
              errors={fieldErrors?.accomCostPerNight}
            >
              <Input
                id="accomCostPerNight"
                name="accomCostPerNight"
                type="number"
                min={0}
                step={1}
                defaultValue={stop.accomCostPerNight ?? ""}
              />
            </Field>
            <Field
              id="dailyFoodEstimate"
              label="Daily food estimate"
              errors={fieldErrors?.dailyFoodEstimate}
            >
              <Input
                id="dailyFoodEstimate"
                name="dailyFoodEstimate"
                type="number"
                min={0}
                step={1}
                defaultValue={stop.dailyFoodEstimate ?? ""}
              />
            </Field>
          </div>
        </div>

        {!isLast ? (
          <div className="border-border/60 border-t pt-5">
            <h3 className="font-display text-base tracking-tight">
              Transport to next stop
            </h3>
            <div className="mt-4 grid gap-5 sm:grid-cols-3">
              <Field
                id="transportMode"
                label="Mode"
                errors={fieldErrors?.transportMode}
              >
                <Select
                  name="transportMode"
                  defaultValue={stop.transportMode ?? undefined}
                >
                  <SelectTrigger id="transportMode">
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
                id="transportCost"
                label="Cost"
                errors={fieldErrors?.transportCost}
              >
                <Input
                  id="transportCost"
                  name="transportCost"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={stop.transportCost ?? ""}
                />
              </Field>
              <Field
                id="transportHours"
                label="Hours"
                errors={fieldErrors?.transportHours}
              >
                <Input
                  id="transportHours"
                  name="transportHours"
                  type="number"
                  min={0}
                  step={0.5}
                  defaultValue={stop.transportHours ?? ""}
                />
              </Field>
            </div>
          </div>
        ) : null}

        {state && !state.ok && !fieldErrors ? (
          <FormError message={state.error} />
        ) : null}

        <div className="flex items-center justify-between border-t border-border/60 pt-5">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={deletePending}
                className="text-destructive gap-2"
              >
                <Trash2 className="size-4" />
                Remove this stop
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display tracking-tight">
                  Remove this stop?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This deletes {stop.city} and all its activities. This cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      startDelete(async () => {
                        await deleteStopAction(stop.id);
                        toast.success("Stop removed");
                      })
                    }
                  >
                    Remove
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <SubmitButton pendingLabel="Saving">Save changes</SubmitButton>
        </div>
      </form>

      <ActivitiesPanel stop={stop} currency={currency} />
    </div>
  );
}
