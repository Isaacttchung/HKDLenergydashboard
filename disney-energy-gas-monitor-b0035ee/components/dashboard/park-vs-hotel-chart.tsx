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
import { parkVsHotelChartTitle } from "@/lib/park-vs-hotel-chart";
import type { ParkVsHotelChart } from "@/lib/types";

interface ParkVsHotelElectricityChartProps {
  chart: ParkVsHotelChart;
}

export function ParkVsHotelElectricityChart({
  chart,
}: ParkVsHotelElectricityChartProps) {
  if (chart.data.length === 0) {
    return null;
  }

  const denseDaily = chart.granularity === "daily" && chart.data.length > 14;
  const denseYearly = chart.granularity === "yearly" && chart.data.length > 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{parkVsHotelChartTitle(chart.granularity)}</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        <ChartContainer>
          <BarChart
            data={chart.data}
            {...getClusteredBarChartProps()}
            margin={{
              top: 8,
              right: 16,
              left: 8,
              bottom: denseDaily || denseYearly ? 48 : 8,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: denseDaily || denseYearly ? 10 : 12 }}
              angle={denseDaily || denseYearly ? -45 : 0}
              textAnchor={denseDaily || denseYearly ? "end" : "middle"}
              height={denseDaily || denseYearly ? 56 : 30}
              interval={denseYearly ? 0 : denseDaily ? 0 : "preserveStartEnd"}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              width={80}
              tickFormatter={(v) =>
                v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
              }
              label={{
                value: "kWh",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 12, fill: "#64748b" },
              }}
            />
            <ChartTooltip />
            <Legend />
            <Bar
              dataKey="themePark"
              name="Theme Park"
              fill="#1d70b8"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="hotel"
              name="Hotel"
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
