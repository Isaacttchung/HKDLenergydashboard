"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getClusteredBarChartProps } from "@/components/dashboard/clustered-bar-layout";
import { GasChartTooltipContent } from "@/components/dashboard/gas-tooltip-content";
import { ChartContainer } from "@/components/dashboard/chart-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyBreakdown, EnergyChart } from "@/lib/types";

interface GasChartProps {
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
    return [{ period: "Resort Gas", primary: breakdown.gasKwh }];
  }

  return chart.data.map((point) => ({
    period: point.period,
    primary: point.gas ?? 0,
    comparison: comparisonChart?.data.find((c) => c.period === point.period)?.gas,
  }));
}

export function GasChart({
  chart,
  title,
  comparisonChart,
  breakdown,
}: GasChartProps) {
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
            <YAxis tick={{ fontSize: 12 }} width={80} />
            <Tooltip content={<GasChartTooltipContent />} />
            <Legend />
            <Bar
              dataKey="primary"
              name="Gas (kWh)"
              fill="#ea580c"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
            {comparisonChart && (
              <Bar
                dataKey="comparison"
                name="Comparison"
                fill="#fdba74"
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
