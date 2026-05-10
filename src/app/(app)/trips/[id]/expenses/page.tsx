import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { MembersPanel } from "@/components/expenses/members-panel";
import { BalancesPanel } from "@/components/expenses/balances-panel";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { ExpensesList } from "@/components/expenses/expenses-list";
import {
  computeBalances,
  settleBalances,
  type ExpenseShareInput,
} from "@/lib/splitwise";
import { currencyConversionEnabled } from "@/lib/currency";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Expenses" };

interface ExpensesPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExpensesPage({ params }: ExpensesPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const trip = await db.trip.findFirst({
    where: {
      id,
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id, status: "active" } } },
      ],
    },
    select: {
      id: true,
      currency: true,
      ownerId: true,
      members: {
        orderBy: { joinedAt: "asc" },
        select: {
          id: true,
          role: true,
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      },
      expenses: {
        orderBy: { paidAt: "desc" },
        select: {
          id: true,
          description: true,
          amount: true,
          currency: true,
          category: true,
          splitMode: true,
          paidAt: true,
          payer: { select: { id: true, name: true } },
          shares: {
            select: {
              userId: true,
              shareAmount: true,
              settled: true,
              user: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!trip) notFound();

  const isOwner = trip.ownerId === session.user.id;

  // Build the inputs for the splitwise functions, excluding settled shares.
  const expenseInputs: ExpenseShareInput[] = trip.expenses.map((e) => ({
    expenseId: e.id,
    payerId: e.payer.id,
    amount: e.amount,
    shares: e.shares
      .filter((s) => !s.settled)
      .map((s) => ({ userId: s.userId, shareAmount: s.shareAmount })),
  }));

  // Adjust payer credit so settled shares don't count.
  for (const e of trip.expenses) {
    const settledTotal = e.shares
      .filter((s) => s.settled)
      .reduce((sum, s) => sum + s.shareAmount, 0);
    const input = expenseInputs.find((i) => i.expenseId === e.id);
    if (input) input.amount -= settledTotal;
  }

  const balances = computeBalances(expenseInputs);
  const transactions = settleBalances(balances);

  const membersById = Object.fromEntries(
    trip.members.map((m) => [
      m.user.id,
      {
        userId: m.user.id,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
      },
    ]),
  );

  // Ensure the balances list contains every member, even with zero net.
  for (const m of trip.members) {
    if (!balances.find((b) => b.userId === m.user.id)) {
      balances.push({ userId: m.user.id, net: 0 });
    }
  }
  balances.sort((a, b) => b.net - a.net);

  const totalSpent = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const memberOptions = trip.members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm tracking-wide uppercase">
            Splitwise
          </p>
          <h1 className="font-display mt-2 text-3xl tracking-tight">
            Expenses
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            Track group spend across multiple currencies and settle up with
            the minimum number of transactions.{" "}
            <span className="text-foreground tabular-nums">
              {formatCurrency(totalSpent, trip.currency)}
            </span>{" "}
            spent so far.
          </p>
        </div>
        <AddExpenseDialog
          tripId={trip.id}
          members={memberOptions}
          tripCurrency={trip.currency}
          conversionEnabled={currencyConversionEnabled}
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="border-border/70 shadow-none">
          <CardContent className="p-6">
            <h2 className="font-display text-lg tracking-tight">All expenses</h2>
            <p className="text-muted-foreground mt-1 mb-5 text-xs">
              Newest first.
            </p>
            <ExpensesList
              expenses={trip.expenses}
              isOwner={isOwner}
              currentUserId={session.user.id}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="border-border/70 shadow-none">
            <CardContent className="p-6">
              <BalancesPanel
                tripId={trip.id}
                currency={trip.currency}
                balances={balances}
                transactions={transactions}
                membersById={membersById}
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-none">
            <CardContent className="p-6">
              <MembersPanel
                tripId={trip.id}
                members={trip.members}
                isOwner={isOwner}
                currentUserId={session.user.id}
                ownerId={trip.ownerId}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
