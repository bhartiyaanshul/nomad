"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { addExpenseAction } from "@/server/actions/expenses";
import type { ActionResult } from "@/server/actions/result";

interface MemberOption {
  userId: string;
  name: string;
}

interface AddExpenseDialogProps {
  tripId: string;
  members: MemberOption[];
  tripCurrency: string;
  conversionEnabled: boolean;
  trigger?: React.ReactNode;
}

const SPLIT_MODES = [
  { value: "equal", label: "Equal" },
  { value: "by_share", label: "By share" },
  { value: "by_exact", label: "By exact" },
  { value: "by_percentage", label: "By percentage" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "INR", "AUD", "CAD"];
const CATEGORIES = [
  { value: "food", label: "Food" },
  { value: "transport", label: "Transport" },
  { value: "accommodation", label: "Accommodation" },
  { value: "activity", label: "Activity" },
  { value: "misc", label: "Misc" },
];

const initial: ActionResult<{ id: string }> | null = null;

export function AddExpenseDialog({
  tripId,
  members,
  tripCurrency,
  conversionEnabled,
  trigger,
}: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const action = addExpenseAction.bind(null, tripId);
  const [state, formAction] = useActionState(action, initial);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  const [splitMode, setSplitMode] = useState("equal");
  const [participantIds, setParticipantIds] = useState<string[]>(
    members.map((m) => m.userId),
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Expense added");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- close after server action
      setOpen(false);
    }
  }, [state]);

  function toggle(userId: string) {
    setParticipantIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          // Reset selection state on open so a previous submission doesn't bleed in.
          setParticipantIds(members.map((m) => m.userId));
          setSplitMode("equal");
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2">
            <Plus className="size-4" />
            Add expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-tight">
            Add an expense
          </DialogTitle>
          <DialogDescription>
            {conversionEnabled
              ? `Amounts in other currencies are converted to ${tripCurrency} at the latest rate.`
              : `Track in ${tripCurrency}. Multi-currency conversion is off (set EXCHANGE_RATE_API_KEY to enable).`}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-5">
          <Field
            id="exp-description"
            label="Description"
            required
            errors={fieldErrors?.description}
          >
            <Input
              id="exp-description"
              name="description"
              required
              placeholder="Hotel three nights"
              maxLength={200}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field
              id="exp-amount"
              label="Amount"
              required
              errors={fieldErrors?.amount}
              className="sm:col-span-2"
            >
              <Input
                id="exp-amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min={0.01}
                step={0.01}
                required
              />
            </Field>
            <Field
              id="exp-currency"
              label="Currency"
              errors={fieldErrors?.currency}
            >
              <Select name="currency" defaultValue={tripCurrency}>
                <SelectTrigger id="exp-currency">
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
            <Field
              id="exp-payerId"
              label="Paid by"
              required
              errors={fieldErrors?.payerId}
            >
              <Select name="payerId" defaultValue={members[0]?.userId}>
                <SelectTrigger id="exp-payerId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="exp-category"
              label="Category"
              errors={fieldErrors?.category}
            >
              <Select name="category" defaultValue="food">
                <SelectTrigger id="exp-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field id="exp-splitMode" label="Split">
            <Select
              name="splitMode"
              value={splitMode}
              onValueChange={setSplitMode}
            >
              <SelectTrigger id="exp-splitMode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPLIT_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="border-border/70 rounded-md border p-4">
            <p className="text-sm font-medium mb-3">
              Who&apos;s splitting this?
            </p>
            <ul className="flex flex-col gap-2">
              {members.map((m) => {
                const checked = participantIds.includes(m.userId);
                return (
                  <li
                    key={m.userId}
                    className="flex items-center justify-between gap-3"
                  >
                    <label className="flex flex-1 items-center gap-2 text-sm">
                      <Checkbox
                        name="participantIds"
                        value={m.userId}
                        checked={checked}
                        onCheckedChange={() => toggle(m.userId)}
                      />
                      <span>{m.name}</span>
                    </label>
                    {checked && splitMode !== "equal" ? (
                      <Input
                        type="number"
                        name={`weight-${m.userId}`}
                        step={splitMode === "by_percentage" ? 1 : 0.01}
                        min={0}
                        placeholder={
                          splitMode === "by_share"
                            ? "1"
                            : splitMode === "by_percentage"
                              ? "%"
                              : "0.00"
                        }
                        className="h-8 w-24 text-xs"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>

          {state && !state.ok && !fieldErrors ? (
            <FormError message={state.error} />
          ) : null}

          <DialogFooter className="gap-2 sm:gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Adding">Add expense</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
