"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Compass, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ActivitySearchDialog } from "./activity-search-dialog";

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
import { ACTIVITY_CATEGORIES } from "@/lib/validation/trip";
import {
  createActivityAction,
  deleteActivityAction,
} from "@/server/actions/activities";
import { CategoryIcon, categoryLabel } from "@/lib/category";
import { formatCurrency } from "@/lib/format";
import type { ActionResult } from "@/server/actions/result";

import type { BuilderStop } from "./types";

interface ActivitiesPanelProps {
  stop: BuilderStop;
  currency: string;
}

const initial: ActionResult<{ id: string }> | null = null;

export function ActivitiesPanel({ stop, currency }: ActivitiesPanelProps) {
  const days = Array.from(
    { length: stop.departureDay - stop.arrivalDay + 1 },
    (_, i) => stop.arrivalDay + i,
  );

  return (
    <div className="border-border/60 rounded-md border">
      <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div>
          <h3 className="font-display text-base tracking-tight">Activities</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {stop.activities.length} planned
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ActivitySearchDialog
            stopId={stop.id}
            arrivalDay={stop.arrivalDay}
            departureDay={stop.departureDay}
            currency={currency}
            trigger={
              <Button size="sm" variant="ghost" className="gap-2">
                <Compass className="size-4" />
                Browse
              </Button>
            }
          />
          <AddActivityDialog
            stopId={stop.id}
            arrivalDay={stop.arrivalDay}
            departureDay={stop.departureDay}
          />
        </div>
      </header>

      <div className="p-5">
        {stop.activities.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing scheduled at this stop yet.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {days.map((day) => {
              const items = stop.activities
                .filter((a) => a.day === day)
                .sort((a, b) => a.name.localeCompare(b.name));
              if (items.length === 0) return null;
              return (
                <div key={day}>
                  <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                    Day {day}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {items.map((act) => (
                      <ActivityRow key={act.id} activity={act} currency={currency} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityRow({
  activity,
  currency,
}: {
  activity: BuilderStop["activities"][number];
  currency: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="border-border/70 bg-card flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="flex items-start gap-3">
        <div className="bg-accent text-accent-foreground rounded-md p-1.5">
          <CategoryIcon category={activity.category} className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{activity.name}</p>
          {activity.description ? (
            <p className="text-muted-foreground mt-0.5 text-sm">
              {activity.description}
            </p>
          ) : null}
          <p className="text-muted-foreground mt-1 text-xs">
            {categoryLabel(activity.category)}
            {activity.estimatedDurationHours ? (
              <> · {activity.estimatedDurationHours}h</>
            ) : null}
            {activity.estimatedCost > 0 ? (
              <> · {formatCurrency(activity.estimatedCost, currency)}</>
            ) : null}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await deleteActivityAction(activity.id);
            toast.success("Activity removed");
          })
        }
        aria-label={`Remove ${activity.name}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

function AddActivityDialog({
  stopId,
  arrivalDay,
  departureDay,
}: {
  stopId: string;
  arrivalDay: number;
  departureDay: number;
}) {
  const [open, setOpen] = useState(false);
  const action = createActivityAction.bind(null, stopId);
  const [state, formAction] = useActionState(action, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.ok) {
      toast.success("Activity added");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- close after server action
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="size-4" />
          Add activity
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg tracking-tight">
            Add an activity
          </DialogTitle>
          <DialogDescription>
            Days {arrivalDay} to {departureDay}.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-5">
          <Field
            id="act-name"
            label="Name"
            required
            errors={fieldErrors?.name}
          >
            <Input
              id="act-name"
              name="name"
              required
              placeholder="Tsukiji Outer Market"
            />
          </Field>

          <Field
            id="act-description"
            label="Description"
            errors={fieldErrors?.description}
          >
            <Textarea
              id="act-description"
              name="description"
              rows={2}
              maxLength={500}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field id="act-day" label="Day" required errors={fieldErrors?.day}>
              <Input
                id="act-day"
                name="day"
                type="number"
                min={arrivalDay}
                max={departureDay}
                defaultValue={arrivalDay}
                required
              />
            </Field>
            <Field
              id="act-category"
              label="Category"
              required
              errors={fieldErrors?.category}
            >
              <Select name="category" defaultValue="sightseeing">
                <SelectTrigger id="act-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="act-estimatedCost"
              label="Cost"
              errors={fieldErrors?.estimatedCost}
            >
              <Input
                id="act-estimatedCost"
                name="estimatedCost"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="act-duration"
              label="Duration (hours)"
              errors={fieldErrors?.estimatedDurationHours}
            >
              <Input
                id="act-duration"
                name="estimatedDurationHours"
                type="number"
                min={0}
                step={0.5}
              />
            </Field>
            <Field
              id="act-bookingUrl"
              label="Booking URL"
              errors={fieldErrors?.bookingUrl}
            >
              <Input
                id="act-bookingUrl"
                name="bookingUrl"
                type="url"
                placeholder="https://"
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
            <SubmitButton pendingLabel="Adding">Add activity</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
