"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { formatCurrency } from "@/lib/format";
import type { BudgetCategory } from "@/lib/budget";

interface CostPieChartProps {
  data: Record<BudgetCategory, number>;
  currency: string;
}

const COLOURS: Record<BudgetCategory, string> = {
  accommodation: "var(--color-chart-1)",
  food: "var(--color-chart-2)",
  activities: "var(--color-chart-3)",
  transport: "var(--color-chart-4)",
  miscellaneous: "var(--color-chart-5)",
};

const LABELS: Record<BudgetCategory, string> = {
  accommodation: "Accommodation",
  food: "Food",
  activities: "Activities",
  transport: "Transport",
  miscellaneous: "Misc",
};

export function CostPieChart({ data, currency }: CostPieChartProps) {
  const entries = (Object.keys(data) as BudgetCategory[])
    .map((k) => ({ name: LABELS[k], key: k, value: data[k] }))
    .filter((e) => e.value > 0);

  if (entries.length === 0) {
    return (
      <div className="flex h-full min-h-[260px] items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Add some costs to see the breakdown.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={entries}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          stroke="var(--color-card)"
          strokeWidth={3}
        >
          {entries.map((e) => (
            <Cell key={e.key} fill={COLOURS[e.key]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
          }}
          formatter={(value) => formatCurrency(Number(value), currency)}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
