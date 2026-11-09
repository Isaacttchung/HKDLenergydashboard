"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "@/components/dashboard/chart-container";
import { HccpGasLegendContent } from "@/components/dashboard/hccp-gas-legend";
import { HccpGasTooltipContent } from "@/components/dashboard/gas-tooltip-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hccpGasChartTitle } from "@/lib/hccp-gas-chart";
import type { HccpGasChart } from "@/lib/types";

interface HccpGasChartPanelProps {
  chart: HccpGasChart;
}

export function HccpGasChartPanel({ chart }: HccpGasChartPanelProps) {
  if (chart.data.length === 0) {
    return null;
  }

  const { axis } = chart;
  const denseDaily = chart.granularity === "daily" && chart.data.length > 14;
  const denseYearly = chart.granularity === "yearly" && chart.data.length > 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{hccpGasChartTitle(chart.granularity)}</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        <ChartContainer>
          <ComposedChart
            data={chart.data}
            margin={{ top: 8, right: 24, left: 8, bottom: denseDaily || denseYearly ? 48 : 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: denseDaily || denseYearly ? 10 : 12 }}
              angle={denseDaily || denseYearly ? -45 : 0}
              textAnchor={denseDaily || denseYearly ? "end" : "middle"}
              height={denseDaily || denseYearly ? 56 : 30}
              interval={denseDaily || denseYearly ? 0 : "preserveStartEnd"}
            />
            <YAxis
              yAxisId="units"
              orientation="left"
              domain={[0, axis.leftMax]}
              ticks={axis.leftTicks}
              tick={{ fontSize: 12 }}
              width={72}
              tickFormatter={(v) => Number(v).toLocaleString()}
              label={{
                value: "Total Gas Consumption (units)",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 11, fill: "#64748b" },
              }}
            />
            <YAxis
              yAxisId="metrics"
              orientation="right"
              domain={[0, axis.rightMax]}
              ticks={axis.rightTicks}
              tick={{ fontSize: 12 }}
              width={56}
              label={{
                value: "% and °C",
                angle: 90,
                position: "insideRight",
                style: { fontSize: 11, fill: "#64748b" },
              }}
            />
            <Tooltip content={<HccpGasTooltipContent />} />
            <Bar
              yAxisId="units"
              dataKey="gasUnits"
              name="Gas Consumption (units)"
              fill="#ea580c"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
            <Line
              yAxisId="metrics"
              type="monotone"
              dataKey="ballroomUtilization"
              name="Ballroom Utilization (%)"
              stroke="#1e293b"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#fff", stroke: "#1e293b", strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              yAxisId="metrics"
              type="monotone"
              dataKey="overallOccupancyPct"
              name="Overall Occupancy (%)"
              stroke="#c4a574"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              yAxisId="metrics"
              type="monotone"
              dataKey="outdoorTempC"
              name="Outdoor Air Temperature (°C)"
              stroke="#7ab3dd"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
            <Legend content={<HccpGasLegendContent />} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
