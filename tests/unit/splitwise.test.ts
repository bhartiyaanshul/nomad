import { describe, expect, it } from "vitest";

import {
  computeBalances,
  settleBalances,
  splitExpense,
} from "@/lib/splitwise";

describe("settleBalances", () => {
  it("returns no transactions when everyone is even", () => {
    expect(
      settleBalances([
        { userId: "a", net: 0 },
        { userId: "b", net: 0 },
        { userId: "c", net: 0 },
      ]),
    ).toEqual([]);
  });

  it("clears a single creditor with multiple debtors", () => {
    const tx = settleBalances([
      { userId: "alice", net: 200 },
      { userId: "bob", net: -120 },
      { userId: "carol", net: -80 },
    ]);
    expect(tx).toHaveLength(2);
    expect(tx).toContainEqual({
      fromUserId: "bob",
      toUserId: "alice",
      amount: 120,
    });
    expect(tx).toContainEqual({
      fromUserId: "carol",
      toUserId: "alice",
      amount: 80,
    });
  });

  it("breaks a chain debt A→B→C→A into the minimum number of moves", () => {
    // A paid 60 for everyone, owes nothing (net +40).
    // B owes A 20 but is owed 30 by C → net +10.
    // C is the source of all debt → net -50.
    const tx = settleBalances([
      { userId: "a", net: 40 },
      { userId: "b", net: 10 },
      { userId: "c", net: -50 },
    ]);
    expect(tx.length).toBeLessThanOrEqual(2);
    const totalMoved = tx.reduce((s, t) => s + t.amount, 0);
    expect(totalMoved).toBe(50);
  });

  it("handles mixed positive and negative cents correctly", () => {
    const tx = settleBalances([
      { userId: "a", net: 33.33 },
      { userId: "b", net: 33.34 },
      { userId: "c", net: -66.67 },
    ]);
    const sum = tx.reduce((s, t) => s + t.amount, 0);
    expect(Math.abs(sum - 66.67)).toBeLessThan(0.02);
    expect(tx.every((t) => t.fromUserId === "c")).toBe(true);
  });

  it("noop on a single user", () => {
    expect(settleBalances([{ userId: "solo", net: 0 }])).toEqual([]);
    expect(settleBalances([{ userId: "solo", net: 100 }])).toEqual([]);
  });
});

describe("splitExpense", () => {
  it("equal split divides cleanly", () => {
    const shares = splitExpense({
      amount: 90,
      mode: "equal",
      participants: ["a", "b", "c"],
    });
    expect(shares).toEqual([
      { userId: "a", shareAmount: 30 },
      { userId: "b", shareAmount: 30 },
      { userId: "c", shareAmount: 30 },
    ]);
  });

  it("equal split absorbs rounding into the last share", () => {
    const shares = splitExpense({
      amount: 100,
      mode: "equal",
      participants: ["a", "b", "c"],
    });
    expect(shares.reduce((s, r) => s + r.shareAmount, 0)).toBeCloseTo(100, 2);
    expect(shares).toHaveLength(3);
  });

  it("by_share weights proportionally", () => {
    const shares = splitExpense({
      amount: 100,
      mode: "by_share",
      participants: ["a", "b"],
      weights: { a: 3, b: 1 },
    });
    expect(shares.find((s) => s.userId === "a")?.shareAmount).toBe(75);
    expect(shares.find((s) => s.userId === "b")?.shareAmount).toBe(25);
  });

  it("by_exact uses absolute amounts and sums to total", () => {
    const shares = splitExpense({
      amount: 100,
      mode: "by_exact",
      participants: ["a", "b"],
      weights: { a: 60, b: 40 },
    });
    expect(shares.reduce((s, r) => s + r.shareAmount, 0)).toBe(100);
  });

  it("by_percentage normalises to 100", () => {
    const shares = splitExpense({
      amount: 200,
      mode: "by_percentage",
      participants: ["a", "b", "c"],
      weights: { a: 50, b: 30, c: 20 },
    });
    expect(shares.find((s) => s.userId === "a")?.shareAmount).toBe(100);
    expect(shares.find((s) => s.userId === "b")?.shareAmount).toBe(60);
    expect(shares.find((s) => s.userId === "c")?.shareAmount).toBe(40);
  });
});

describe("computeBalances", () => {
  it("nets payer credit against share debits", () => {
    const balances = computeBalances([
      {
        expenseId: "e1",
        payerId: "alice",
        amount: 90,
        shares: [
          { userId: "alice", shareAmount: 30 },
          { userId: "bob", shareAmount: 30 },
          { userId: "carol", shareAmount: 30 },
        ],
      },
    ]);
    expect(balances.find((b) => b.userId === "alice")?.net).toBe(60);
    expect(balances.find((b) => b.userId === "bob")?.net).toBe(-30);
    expect(balances.find((b) => b.userId === "carol")?.net).toBe(-30);
  });
});
