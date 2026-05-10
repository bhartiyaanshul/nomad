"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { updatePreferencesAction } from "@/server/actions/user";
import type { ActionResult } from "@/server/actions/result";

interface PreferencesTabProps {
  preferences: {
    language: string;
    currency: string;
    personality: string | null;
  };
}

const initial: ActionResult<{ updated: true }> | null = null;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "hi", label: "Hindi" },
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

export function PreferencesTab({ preferences }: PreferencesTabProps) {
  const [state, action] = useActionState(updatePreferencesAction, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.ok) toast.success("Preferences saved");
  }, [state]);

  return (
    <form action={action} className="flex max-w-xl flex-col gap-6">
      <Field id="language" label="Language" errors={fieldErrors?.language}>
        <Select name="language" defaultValue={preferences.language}>
          <SelectTrigger id="language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        id="currency"
        label="Default currency"
        hint="Used as the default for new trips and budgets."
        errors={fieldErrors?.currency}
      >
        <Select name="currency" defaultValue={preferences.currency}>
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

      <Field
        id="personality"
        label="Travel personality"
        hint="Shapes the AI itinerary recommendations across the app."
        errors={fieldErrors?.personality}
      >
        <Select
          name="personality"
          defaultValue={preferences.personality ?? undefined}
        >
          <SelectTrigger id="personality">
            <SelectValue placeholder="Set later" />
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

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving">Save preferences</SubmitButton>
      </div>
    </form>
  );
}
