"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/lib/format";

interface CostByDayChartProps {
  data: Array<{ day: number; total: number }>;
  currency: string;
  dailyAllowance?: number | null;
}

export function CostByDayChart({
  data,
  currency,
  dailyAllowance,
}: CostByDayChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="day"
          tickFormatter={(d) => `D${d}`}
          stroke="var(--color-muted-foreground)"
          fontSize={11}
          tickLine={false}
        />
        <YAxis
          stroke="var(--color-muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrency(v, currency, { maximumFractionDigits: 0 })}
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
          }}
          labelFormatter={(d) => `Day ${d}`}
          formatter={(value) => [
            formatCurrency(Number(value), currency),
            "Cost",
          ]}
        />
        {dailyAllowance ? (
          <ReferenceLine
            y={dailyAllowance}
            stroke="var(--color-chart-3)"
            strokeDasharray="4 4"
            label={{
              value: "Daily allowance",
              position: "insideTopLeft",
              fontSize: 10,
              fill: "var(--color-muted-foreground)",
            }}
          />
        ) : null}
        <Bar dataKey="total" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
