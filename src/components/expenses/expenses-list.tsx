"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteExpenseAction } from "@/server/actions/expenses";
import { formatCurrency } from "@/lib/format";

interface ExpenseShape {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  splitMode: string;
  paidAt: Date;
  payer: { id: string; name: string };
  shares: Array<{
    userId: string;
    shareAmount: number;
    settled: boolean;
    user: { name: string };
  }>;
}

const SPLIT_LABELS: Record<string, string> = {
  equal: "Equal",
  by_share: "By share",
  by_exact: "By exact",
  by_percentage: "By %",
};

interface ExpensesListProps {
  expenses: ExpenseShape[];
  isOwner: boolean;
  currentUserId: string;
}

export function ExpensesList({
  expenses,
  isOwner,
  currentUserId,
}: ExpensesListProps) {
  if (expenses.length === 0) {
    return (
      <div className="border-border/60 rounded-md border border-dashed p-8 text-center">
        <p className="text-muted-foreground text-sm">
          No expenses yet. Add the first one above.
        </p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {expenses.map((e) => (
        <ExpenseRow
          key={e.id}
          expense={e}
          canDelete={isOwner || e.payer.id === currentUserId}
        />
      ))}
    </ul>
  );
}

function ExpenseRow({
  expense,
  canDelete,
}: {
  expense: ExpenseShape;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const allSettled = expense.shares.every((s) => s.settled);
  return (
    <li className="border-border/70 bg-card flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{expense.description}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {expense.payer.name} paid · {format(expense.paidAt, "d MMM")} ·{" "}
            <span className="capitalize">{expense.category}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-display text-base tabular-nums tracking-tight">
            {formatCurrency(expense.amount, expense.currency)}
          </p>
          {canDelete ? (
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-label="Delete expense"
              onClick={() =>
                startTransition(async () => {
                  await deleteExpenseAction(expense.id);
                  toast.success("Expense removed");
                })
              }
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          {SPLIT_LABELS[expense.splitMode] ?? expense.splitMode}
        </Badge>
        {allSettled ? (
          <Badge variant="secondary" className="text-[10px]">
            Settled
          </Badge>
        ) : null}
        <p className="text-muted-foreground text-xs">
          {expense.shares.map((s, i) => (
            <span key={s.userId + i}>
              {i > 0 ? " · " : ""}
              <span className={s.settled ? "line-through opacity-60" : ""}>
                {s.user.name} {formatCurrency(s.shareAmount, expense.currency)}
              </span>
            </span>
          ))}
        </p>
      </div>
    </li>
  );
}
