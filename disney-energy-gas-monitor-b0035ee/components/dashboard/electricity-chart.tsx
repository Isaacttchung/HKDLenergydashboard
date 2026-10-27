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

interface ElectricityChartProps {
  chart: EnergyChart;
  title: string;
  comparisonChart?: EnergyChart;
  breakdown?: DailyBreakdown;
}

function buildChartData(
  chart: EnergyChart,
  comparisonChart?: EnergyChart,
  breakdown?: DailyBreakdown,
) {
  if (breakdown && chart.granularity === "by_installation") {
    return [
      { period: "Park", primary: breakdown.park },
      { period: "CCP", primary: breakdown.ccp },
      { period: "HCCP", primary: breakdown.hccp },
      { period: "Hotels", primary: breakdown.hotelTotal },
    ];
  }

  return chart.data.map((point) => ({
    period: point.period,
    primary: point.electricity ?? 0,
    comparison: comparisonChart?.data.find((c) => c.period === point.period)
      ?.electricity,
  }));
}

export function ElectricityChart({
  chart,
  title,
  comparisonChart,
  breakdown,
}: ElectricityChartProps) {
  const data = buildChartData(chart, comparisonChart, breakdown);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        <ChartContainer>
          <BarChart
            data={data}
            {...(comparisonChart ? getClusteredBarChartProps() : {})}
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
              dataKey="primary"
              name="Electricity (kWh)"
              fill="#1d70b8"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
            {comparisonChart && (
              <Bar
                dataKey="comparison"
                name="Comparison"
                fill="#7ab3dd"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            )}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
