"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { signupAction } from "@/server/actions/auth";
import type { ActionResult } from "@/server/actions/result";

const initial: ActionResult<{ email: string }> | null = null;

export function SignupForm() {
  const [state, action] = useActionState(signupAction, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Field
        id="name"
        label="Full name"
        required
        errors={fieldErrors?.name}
      >
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder="Anshul Bhartiya"
        />
      </Field>

      <Field
        id="email"
        label="Email"
        required
        errors={fieldErrors?.email}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>

      <Field
        id="password"
        label="Password"
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

      {state && !state.ok && !fieldErrors ? (
        <FormError message={state.error} />
      ) : null}

      <SubmitButton size="lg" pendingLabel="Creating account">
        Create account
      </SubmitButton>
    </form>
  );
}
