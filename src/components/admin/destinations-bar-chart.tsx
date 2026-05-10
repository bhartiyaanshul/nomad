"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DestinationsBarChartProps {
  data: Array<{ city: string; count: number }>;
}

export function DestinationsBarChart({ data }: DestinationsBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          type="number"
          stroke="var(--color-muted-foreground)"
          fontSize={10}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="city"
          stroke="var(--color-muted-foreground)"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          width={100}
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
          }}
        />
        <Bar
          dataKey="count"
          fill="var(--color-chart-2)"
          radius={[0, 3, 3, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
