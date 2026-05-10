"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Field, FormError, FormSuccess } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { forgotPasswordAction } from "@/server/actions/auth";
import type { ActionResult } from "@/server/actions/result";

const initial: ActionResult<{ sent: true }> | null = null;

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  if (state?.ok) {
    return (
      <FormSuccess message="If that email is registered, a reset link is on its way. The link expires in 60 minutes." />
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Field id="email" label="Email" required errors={fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>

      {state && !state.ok && !fieldErrors ? (
        <FormError message={state.error} />
      ) : null}

      <SubmitButton size="lg" pendingLabel="Sending link">
        Send reset link
      </SubmitButton>
    </form>
  );
}
