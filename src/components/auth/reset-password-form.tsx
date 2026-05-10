"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { resetPasswordAction } from "@/server/actions/auth";
import type { ActionResult } from "@/server/actions/result";

const initial: ActionResult<{ reset: true }> | null = null;

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [state, action] = useActionState(resetPasswordAction, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="token" value={token} />

      <Field
        id="password"
        label="New password"
        hint="Eight characters or more, with an uppercase letter and a number."
        required
        errors={fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <Field
        id="confirm"
        label="Confirm new password"
        required
        errors={fieldErrors?.confirm}
      >
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      {state && !state.ok && !fieldErrors ? (
        <FormError message={state.error} />
      ) : null}

      <SubmitButton size="lg" pendingLabel="Updating password">
        Update password
      </SubmitButton>
    </form>
  );
}
