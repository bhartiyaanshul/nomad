// Greedy minimum-transactions settlement: at each step, pair the largest
// debtor with the largest creditor and settle the lesser of the two amounts.
// Result: at most N-1 transactions for N members, often far fewer.

export interface Transaction {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export interface Balance {
  userId: string;
  net: number; // positive = owed money; negative = owes money
}

const EPSILON = 0.005;

export function settleBalances(balances: Balance[]): Transaction[] {
  // Round to 2dp and copy so we don't mutate caller state.
  const arr = balances
    .map((b) => ({ userId: b.userId, net: round(b.net) }))
    .filter((b) => Math.abs(b.net) > EPSILON);

  const transactions: Transaction[] = [];

  while (arr.length > 1) {
    arr.sort((a, b) => a.net - b.net);
    const debtor = arr[0];
    const creditor = arr[arr.length - 1];

    // If the smallest is no longer negative, we're done.
    if (debtor.net >= -EPSILON || creditor.net <= EPSILON) break;

    const settled = Math.min(-debtor.net, creditor.net);
    transactions.push({
      fromUserId: debtor.userId,
      toUserId: creditor.userId,
      amount: round(settled),
    });

    debtor.net = round(debtor.net + settled);
    creditor.net = round(creditor.net - settled);

    // Drop anyone who's settled.
    if (Math.abs(debtor.net) < EPSILON) arr.shift();
    if (Math.abs(creditor.net) < EPSILON) arr.pop();
  }

  return transactions;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface ExpenseShareInput {
  expenseId: string;
  payerId: string;
  amount: number; // already converted to trip currency
  shares: Array<{ userId: string; shareAmount: number }>;
}

/**
 * Compute net balance per user across a list of expenses.
 * `payer` is credited the full amount; each `share` is debited from
 * the share-holder. Settled shares are excluded by the caller.
 */
export function computeBalances(expenses: ExpenseShareInput[]): Balance[] {
  const totals = new Map<string, number>();

  for (const e of expenses) {
    totals.set(e.payerId, (totals.get(e.payerId) ?? 0) + e.amount);
    for (const s of e.shares) {
      totals.set(s.userId, (totals.get(s.userId) ?? 0) - s.shareAmount);
    }
  }

  return Array.from(totals.entries()).map(([userId, net]) => ({
    userId,
    net: round(net),
  }));
}

export type SplitMode =
  | "equal"
  | "by_share"
  | "by_exact"
  | "by_percentage";

export interface SplitInput {
  amount: number;
  mode: SplitMode;
  participants: string[];
  /** Required for by_share / by_exact / by_percentage. Keys are userIds. */
  weights?: Record<string, number>;
}

/**
 * Build a list of {userId, shareAmount} entries from the chosen split mode,
 * adjusting the last entry to absorb rounding so the sum matches `amount`.
 */
export function splitExpense(input: SplitInput): Array<{
  userId: string;
  shareAmount: number;
}> {
  const { amount, mode, participants, weights = {} } = input;
  if (participants.length === 0) return [];

  let raw: Array<{ userId: string; shareAmount: number }>;

  if (mode === "equal") {
    const each = amount / participants.length;
    raw = participants.map((userId) => ({
      userId,
      shareAmount: round(each),
    }));
  } else if (mode === "by_share") {
    const totalWeight =
      participants.reduce((s, u) => s + (weights[u] ?? 0), 0) || 1;
    raw = participants.map((userId) => ({
      userId,
      shareAmount: round((amount * (weights[userId] ?? 0)) / totalWeight),
    }));
  } else if (mode === "by_percentage") {
    raw = participants.map((userId) => ({
      userId,
      shareAmount: round((amount * (weights[userId] ?? 0)) / 100),
    }));
  } else {
    // by_exact — weights are absolute amounts
    raw = participants.map((userId) => ({
      userId,
      shareAmount: round(weights[userId] ?? 0),
    }));
  }

  // Reconcile rounding so shares sum exactly to amount.
  const sum = raw.reduce((s, r) => s + r.shareAmount, 0);
  const diff = round(amount - sum);
  if (Math.abs(diff) > EPSILON && raw.length > 0) {
    raw[raw.length - 1].shareAmount = round(
      raw[raw.length - 1].shareAmount + diff,
    );
  }

  return raw;
}
