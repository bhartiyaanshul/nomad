"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { changePasswordAction } from "@/server/actions/user";
import type { ActionResult } from "@/server/actions/result";

const initial: ActionResult<{ updated: true }> | null = null;

export function SecurityTab() {
  const [state, action] = useActionState(changePasswordAction, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Password updated");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex max-w-xl flex-col gap-6"
    >
      <h3 className="font-display text-lg tracking-tight">
        Change password
      </h3>

      <Field
        id="currentPassword"
        label="Current password"
        required
        errors={fieldErrors?.currentPassword}
      >
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field
        id="newPassword"
        label="New password"
        hint="Eight characters or more, with an uppercase letter and a number."
        required
        errors={fieldErrors?.newPassword}
      >
        <Input
          id="newPassword"
          name="newPassword"
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

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Updating">Update password</SubmitButton>
      </div>
    </form>
  );
}
