"use client";

import { useActionState, useState } from "react";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { deleteAccountAction } from "@/server/actions/user";
import type { ActionResult } from "@/server/actions/result";

const initial: ActionResult<never> | null = null;

export function DangerZoneTab() {
  const [state, action] = useActionState(deleteAccountAction, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const [open, setOpen] = useState(false);

  return (
    <div className="border-destructive/30 bg-destructive/5 rounded-md border p-6">
      <h3 className="font-display text-destructive text-lg tracking-tight">
        Delete account
      </h3>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
        Permanently remove your account, your trips, your expense history, and
        any data others can&apos;t take ownership of. This cannot be undone.
      </p>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="mt-4">
            Delete my account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <form action={action} className="flex flex-col gap-5">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-lg">
                This will permanently delete your account.
              </AlertDialogTitle>
              <AlertDialogDescription>
                Confirm with your password and the phrase below. There&apos;s
                no recovery once this completes.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <Field
              id="delete-password"
              label="Password"
              required
              errors={fieldErrors?.password}
            >
              <Input
                id="delete-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>

            <Field
              id="delete-confirm"
              label="Type DELETE MY ACCOUNT to confirm"
              required
              errors={fieldErrors?.confirm}
            >
              <Input
                id="delete-confirm"
                name="confirm"
                type="text"
                autoComplete="off"
                required
                placeholder="DELETE MY ACCOUNT"
              />
            </Field>

            {state && !state.ok && !fieldErrors ? (
              <FormError message={state.error} />
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <SubmitButton variant="destructive" pendingLabel="Deleting">
                  Delete forever
                </SubmitButton>
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
