"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Field, FormError, FormSuccess } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { loginAction } from "@/server/actions/auth";
import type { ActionResult } from "@/server/actions/result";

const initial: ActionResult<{ email: string }> | null = null;

interface LoginFormProps {
  callbackUrl?: string;
  resetSuccess?: boolean;
}

export function LoginForm({ callbackUrl = "/dashboard", resetSuccess }: LoginFormProps) {
  const [state, action] = useActionState(loginAction, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {resetSuccess ? (
        <FormSuccess message="Password updated. Sign in with your new password." />
      ) : null}

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

      <Field id="password" label="Password" required errors={fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <Link
          href="/forgot-password"
          className="text-muted-foreground hover:text-foreground self-end text-xs transition"
        >
          Forgot password?
        </Link>
      </Field>

      {state && !state.ok && !fieldErrors ? (
        <FormError message={state.error} />
      ) : null}

      <SubmitButton size="lg" pendingLabel="Signing in">
        Sign in
      </SubmitButton>
    </form>
  );
}
