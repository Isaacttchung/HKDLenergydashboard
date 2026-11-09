"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  XAxis,
  YAxis,
} from "recharts";
import { getClusteredBarChartProps } from "@/components/dashboard/clustered-bar-layout";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import { ChartContainer } from "@/components/dashboard/chart-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyBreakdown, EnergyChart } from "@/lib/types";

interface ComparisonChartProps {
  chart: EnergyChart;
  title: string;
  comparisonChart?: EnergyChart;
  breakdown?: DailyBreakdown;
}

function buildChartData(chart: EnergyChart, breakdown?: DailyBreakdown) {
  if (breakdown && chart.granularity === "by_installation") {
    return [
      { period: "Park", electricity: breakdown.park, gas: 0 },
      { period: "CCP", electricity: breakdown.ccp, gas: 0 },
      { period: "HCCP", electricity: breakdown.hccp, gas: 0 },
      { period: "Hotels", electricity: breakdown.hotelTotal, gas: 0 },
      {
        period: "Gas (kWh)",
        electricity: 0,
        gas: breakdown.gasKwh,
      },
    ];
  }

  return chart.data.map((point) => ({
    period: point.period,
    electricity: point.electricity ?? 0,
    gas: point.gas ?? 0,
  }));
}

export function ComparisonChart({
  chart,
  title,
  breakdown,
}: ComparisonChartProps) {
  const data = buildChartData(chart, breakdown);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        <ChartContainer>
          <BarChart
            data={data}
            {...getClusteredBarChartProps()}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              width={80}
              tickFormatter={(v) =>
                v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
              }
            />
            <ChartTooltip />
            <Legend />
            <Bar
              dataKey="electricity"
              name="Electricity (kWh)"
              fill="#1d70b8"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="gas"
              name="Gas (kWh)"
              fill="#ea580c"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
