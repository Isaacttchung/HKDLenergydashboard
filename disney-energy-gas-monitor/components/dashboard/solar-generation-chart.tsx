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
import { formatChartKwhValue } from "@/components/dashboard/chart-tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { solarGenerationChartTitle } from "@/lib/solar-generation-trend-chart";
import type { SolarGenerationTrendChart } from "@/lib/types";

interface SolarGenerationChartProps {
  chart: SolarGenerationTrendChart;
}

function SolarTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Record<string, unknown> }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const labelText = label != null ? String(label) : undefined;

  const point = payload[0]?.payload as {
    generationKwh?: number;
    sunshineHours?: number;
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      {labelText ? (
        <p className="mb-2 border-b border-slate-100 pb-1.5 font-medium text-slate-900">
          {labelText}
        </p>
      ) : null}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 text-slate-700">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm bg-[#1d70b8]" />
            Total (kWh)
          </span>
          <span className="font-medium tabular-nums text-slate-900">
            {formatChartKwhValue(point?.generationKwh ?? 0)} kWh
          </span>
        </div>
        {point?.sunshineHours != null && Number.isFinite(point.sunshineHours) ? (
          <div className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2 text-slate-700">
              <span className="inline-block h-0.5 w-4 shrink-0 rounded-full bg-[#ea580c]" />
              Sunshine (Hr)
            </span>
            <span className="font-medium tabular-nums text-slate-900">
              {formatChartKwhValue(point.sunshineHours)} Hr
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SolarGenerationChart({ chart }: SolarGenerationChartProps) {
  if (chart.data.length === 0) {
    return null;
  }

  const { axis } = chart;
  const denseDaily = chart.granularity === "daily" && chart.data.length > 14;
  const denseYearly = chart.granularity === "yearly" && chart.data.length > 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{solarGenerationChartTitle(chart.granularity)}</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        <ChartContainer>
          <ComposedChart
            data={chart.data}
            margin={{
              top: 8,
              right: 24,
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
              interval={denseDaily || denseYearly ? 0 : "preserveStartEnd"}
            />
            <YAxis
              yAxisId="kwh"
              orientation="left"
              domain={[0, axis.leftMax]}
              ticks={axis.leftTicks}
              tick={{ fontSize: 12 }}
              width={72}
              tickFormatter={(v) => Number(v).toLocaleString()}
              label={{
                value: "kWh",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 11, fill: "#64748b" },
              }}
            />
            <YAxis
              yAxisId="sunshine"
              orientation="right"
              domain={[0, axis.rightMax]}
              ticks={axis.rightTicks}
              tick={{ fontSize: 12 }}
              width={56}
              label={{
                value: "Sunshine (Hr)",
                angle: 90,
                position: "insideRight",
                style: { fontSize: 11, fill: "#64748b" },
              }}
            />
            <Tooltip content={<SolarTooltipContent />} />
            <Legend />
            <Bar
              yAxisId="kwh"
              dataKey="generationKwh"
              name="Total (kWh)"
              fill="#1d70b8"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
            <Line
              yAxisId="sunshine"
              type="monotone"
              dataKey="sunshineHours"
              name="Sunshine (Hr)"
              stroke="#ea580c"
              strokeWidth={2}
              dot={{ r: 3, fill: "#ea580c" }}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
