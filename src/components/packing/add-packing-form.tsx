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
import { Switch } from "@/components/ui/switch";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { addPackingItemAction } from "@/server/actions/packing";
import type { ActionResult } from "@/server/actions/result";

const initial: ActionResult<{ id: string }> | null = null;

export function AddPackingForm({ tripId }: { tripId: string }) {
  const action = addPackingItemAction.bind(null, tripId);
  const [state, formAction] = useActionState(action, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Item added");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 sm:grid-cols-[1fr_140px_100px_auto_auto]"
      noValidate
    >
      <Field id="pack-item" label="Item" required errors={fieldErrors?.item}>
        <Input id="pack-item" name="item" required maxLength={120} />
      </Field>
      <Field
        id="pack-category"
        label="Category"
        errors={fieldErrors?.category}
      >
        <Select name="category" defaultValue="clothing">
          <SelectTrigger id="pack-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="documents">Documents</SelectItem>
            <SelectItem value="clothing">Clothing</SelectItem>
            <SelectItem value="toiletries">Toiletries</SelectItem>
            <SelectItem value="electronics">Electronics</SelectItem>
            <SelectItem value="gear">Gear</SelectItem>
            <SelectItem value="misc">Other</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field id="pack-quantity" label="Qty" errors={fieldErrors?.quantity}>
        <Input
          id="pack-quantity"
          name="quantity"
          type="number"
          min={1}
          defaultValue={1}
        />
      </Field>
      <Field id="pack-essential" label="Essential">
        <div className="flex h-9 items-center">
          <Switch id="pack-essential" name="essential" />
        </div>
      </Field>
      <div className="flex items-end">
        <SubmitButton pendingLabel="Adding">Add</SubmitButton>
      </div>
      {state && !state.ok && !fieldErrors ? (
        <FormError message={state.error} />
      ) : null}
    </form>
  );
}
