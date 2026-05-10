"use client";

import { useActionState } from "react";

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
import { createTripAction } from "@/server/actions/trips";
import type { ActionResult } from "@/server/actions/result";

const initial: ActionResult<{ tripId: string }> | null = null;

const PERSONALITIES = [
  { value: "none", label: "Decide later" },
  { value: "foodie", label: "Foodie" },
  { value: "adventurer", label: "Adventurer" },
  { value: "culture", label: "Culture" },
  { value: "chill", label: "Chill" },
  { value: "social", label: "Social" },
  { value: "budget", label: "Budget" },
  { value: "luxury", label: "Luxury" },
  { value: "mixed", label: "Mixed" },
];

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "INR",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "SGD",
];

interface CreateTripFormProps {
  defaultCurrency: string;
  defaultPersonality: string | null;
}

export function CreateTripForm({
  defaultCurrency,
  defaultPersonality,
}: CreateTripFormProps) {
  const [state, action] = useActionState(createTripAction, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="flex flex-col gap-6">
      <Field id="name" label="Trip name" required errors={fieldErrors?.name}>
        <Input
          id="name"
          name="name"
          required
          placeholder="Vietnam street-food run"
          maxLength={120}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          id="startDate"
          label="Start date"
          required
          errors={fieldErrors?.startDate}
        >
          <Input id="startDate" name="startDate" type="date" required />
        </Field>
        <Field
          id="endDate"
          label="End date"
          required
          errors={fieldErrors?.endDate}
        >
          <Input id="endDate" name="endDate" type="date" required />
        </Field>
      </div>

      <Field
        id="description"
        label="Description"
        hint="A line or two for context. Optional."
        errors={fieldErrors?.description}
      >
        <Textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-3">
        <Field
          id="totalBudget"
          label="Total budget"
          hint="Optional"
          errors={fieldErrors?.totalBudget}
          className="sm:col-span-2"
        >
          <Input
            id="totalBudget"
            name="totalBudget"
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            placeholder="1500"
          />
        </Field>
        <Field id="currency" label="Currency" errors={fieldErrors?.currency}>
          <Select name="currency" defaultValue={defaultCurrency}>
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        id="personality"
        label="Travel personality for this trip"
        hint="Use a mode that differs from your default for a one-off trip."
        errors={fieldErrors?.personality}
      >
        <Select name="personality" defaultValue={defaultPersonality ?? "none"}>
          <SelectTrigger id="personality">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERSONALITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {state && !state.ok && !fieldErrors ? (
        <FormError message={state.error} />
      ) : null}

      <div className="flex justify-end gap-3 pt-2">
        <SubmitButton size="lg" pendingLabel="Creating">
          Create trip
        </SubmitButton>
      </div>
    </form>
  );
}
