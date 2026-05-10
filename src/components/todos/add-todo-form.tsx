"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { addTodoAction } from "@/server/actions/todos";
import type { ActionResult } from "@/server/actions/result";

const initial: ActionResult<{ id: string }> | null = null;

export function AddTodoForm({ tripId }: { tripId: string }) {
  const action = addTodoAction.bind(null, tripId);
  const [state, formAction] = useActionState(action, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Todo added");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      noValidate
    >
      <Field
        id="todo-content"
        label="What's the action?"
        required
        errors={fieldErrors?.content}
        className="flex-1"
      >
        <Input
          id="todo-content"
          name="content"
          placeholder="Renew passport"
          required
          maxLength={200}
        />
      </Field>
      <Field
        id="todo-dueAt"
        label="Due"
        required
        errors={fieldErrors?.dueAt}
      >
        <Input
          id="todo-dueAt"
          name="dueAt"
          type="datetime-local"
          required
          className="sm:w-48"
        />
      </Field>
      <Field
        id="todo-priority"
        label="Priority"
        errors={fieldErrors?.priority}
      >
        <Select name="priority" defaultValue="normal">
          <SelectTrigger id="todo-priority" className="sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <SubmitButton size="default" pendingLabel="Adding">
        Add
      </SubmitButton>
      {state && !state.ok && !fieldErrors ? (
        <FormError message={state.error} />
      ) : null}
    </form>
  );
}
