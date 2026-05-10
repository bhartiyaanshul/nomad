"use client";

import { useActionState, useEffect } from "react";
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
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { upsertMatchProfileAction } from "@/server/actions/match";
import type { ActionResult } from "@/server/actions/result";

interface MatchProfileFormProps {
  initial?: {
    region: string;
    startDate: string;
    endDate: string;
    personality: string;
    budgetMin: number;
    budgetMax: number;
    currency: string;
    groupSize: number;
    pace?: string | null;
    interests?: string[];
    languages?: string[];
    experience?: string | null;
  } | null;
}

const initial: ActionResult<{ id: string }> | null = null;

const PERSONALITIES = [
  { value: "foodie", label: "Foodie" },
  { value: "adventurer", label: "Adventurer" },
  { value: "culture", label: "Culture" },
  { value: "chill", label: "Chill" },
  { value: "social", label: "Social" },
  { value: "budget", label: "Budget" },
  { value: "luxury", label: "Luxury" },
  { value: "mixed", label: "Mixed" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "INR", "AUD", "CAD"];

export function MatchProfileForm({ initial: existing }: MatchProfileFormProps) {
  const [state, action] = useActionState(upsertMatchProfileAction, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.ok) toast.success("Match profile saved");
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Field
        id="match-region"
        label="Where are you going?"
        required
        errors={fieldErrors?.region}
        hint="A country or wider region works well."
      >
        <Input
          id="match-region"
          name="region"
          required
          maxLength={80}
          defaultValue={existing?.region}
          placeholder="Vietnam"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="match-startDate"
          label="Start"
          required
          errors={fieldErrors?.startDate}
        >
          <Input
            id="match-startDate"
            name="startDate"
            type="date"
            required
            defaultValue={existing?.startDate}
          />
        </Field>
        <Field
          id="match-endDate"
          label="End"
          required
          errors={fieldErrors?.endDate}
        >
          <Input
            id="match-endDate"
            name="endDate"
            type="date"
            required
            defaultValue={existing?.endDate}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="match-personality"
          label="Personality"
          required
          errors={fieldErrors?.personality}
        >
          <Select
            name="personality"
            defaultValue={existing?.personality ?? "mixed"}
          >
            <SelectTrigger id="match-personality">
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
        <Field id="match-groupSize" label="Group size" errors={fieldErrors?.groupSize}>
          <Input
            id="match-groupSize"
            name="groupSize"
            type="number"
            min={2}
            max={10}
            defaultValue={existing?.groupSize ?? 2}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          id="match-budgetMin"
          label="Min daily budget"
          required
          errors={fieldErrors?.budgetMin}
        >
          <Input
            id="match-budgetMin"
            name="budgetMin"
            type="number"
            min={0}
            step={5}
            required
            defaultValue={existing?.budgetMin ?? 30}
          />
        </Field>
        <Field
          id="match-budgetMax"
          label="Max daily budget"
          required
          errors={fieldErrors?.budgetMax}
        >
          <Input
            id="match-budgetMax"
            name="budgetMax"
            type="number"
            min={0}
            step={5}
            required
            defaultValue={existing?.budgetMax ?? 120}
          />
        </Field>
        <Field
          id="match-currency"
          label="Currency"
          errors={fieldErrors?.currency}
        >
          <Select
            name="currency"
            defaultValue={existing?.currency ?? "USD"}
          >
            <SelectTrigger id="match-currency">
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

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="match-pace" label="Pace">
          <Select name="pace" defaultValue={existing?.pace ?? "balanced"}>
            <SelectTrigger id="match-pace">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fast">Fast</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="slow">Slow</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field
          id="match-experience"
          label="Travel experience"
          hint="A short phrase — beginner, well-travelled, etc."
        >
          <Input
            id="match-experience"
            name="experience"
            maxLength={120}
            defaultValue={existing?.experience ?? ""}
            placeholder="A few trips a year, mostly Europe."
          />
        </Field>
      </div>

      <Field
        id="match-interests"
        label="Interests"
        hint="Comma-separated. Helps the model understand your style."
      >
        <Textarea
          id="match-interests"
          name="interests"
          rows={2}
          maxLength={200}
          defaultValue={existing?.interests?.join(", ") ?? ""}
          placeholder="hiking, espresso, jazz, modernist architecture"
        />
      </Field>

      <Field
        id="match-languages"
        label="Languages"
        hint="Comma-separated."
      >
        <Input
          id="match-languages"
          name="languages"
          maxLength={120}
          defaultValue={existing?.languages?.join(", ") ?? ""}
          placeholder="English, Spanish"
        />
      </Field>

      {state && !state.ok && !fieldErrors ? (
        <FormError message={state.error} />
      ) : null}

      <div className="flex justify-end pt-2">
        <SubmitButton size="lg" pendingLabel="Saving">
          {existing ? "Update profile" : "Create profile"}
        </SubmitButton>
      </div>
    </form>
  );
}
