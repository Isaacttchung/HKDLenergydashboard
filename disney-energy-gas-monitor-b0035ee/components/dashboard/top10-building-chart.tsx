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
import { formatChartKwhValue } from "@/components/dashboard/chart-tooltip";
import { ChartContainer } from "@/components/dashboard/chart-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOP10_CHART_TITLE } from "@/lib/top10-building-chart";
import type { Top10BuildingChart, Top10BuildingChartSeries } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const TOP10_CHART_HEIGHT = 380;

function Top10LegendContent({ series }: { series: Top10BuildingChartSeries[] }) {
  return (
    <ul className="recharts-default-legend flex flex-wrap justify-center gap-x-5 gap-y-2 px-2 pt-5 pb-0 text-[11px] text-slate-700">
      {series.map((item) => (
        <li
          key={item.dataKey}
          className="inline-flex items-center gap-1.5"
        >
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.name}</span>
        </li>
      ))}
    </ul>
  );
}

interface Top10BuildingChartPanelProps {
  chart: Top10BuildingChart;
}

function Top10Tooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    name?: string;
    value?: number;
    color?: string;
    payload?: Top10BuildingChart["data"][number];
  }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const title = point?.fullLabel ?? (label != null ? String(label) : undefined);

  return (
    <div className="max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      {title ? (
        <p className="mb-2 border-b border-slate-100 pb-1.5 font-medium text-slate-900">
          {title}
        </p>
      ) : null}
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between gap-4"
          >
            <span className="flex items-center gap-2 text-slate-700">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-medium tabular-nums text-slate-900">
              {formatChartKwhValue(entry.value ?? 0)} kWh
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Top10BuildingChartPanel({ chart }: Top10BuildingChartPanelProps) {
  if (chart.data.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{chart.title || TOP10_CHART_TITLE}</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        <ChartContainer height={TOP10_CHART_HEIGHT}>
          <BarChart
            data={chart.data}
            {...getClusteredBarChartProps()}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={88}
              interval={0}
            />
            <YAxis
              domain={[0, chart.axis.leftMax]}
              ticks={chart.axis.leftTicks}
              tick={{ fontSize: 11 }}
              width={72}
              tickFormatter={(v) => formatNumber(Number(v))}
              label={{
                value: "kWh",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 11, fill: "#64748b" },
              }}
            />
            <Tooltip content={<Top10Tooltip />} />
            <Legend
              verticalAlign="bottom"
              align="center"
              content={<Top10LegendContent series={chart.series} />}
            />
            {chart.series.map((series) => (
              <Bar
                key={series.dataKey}
                dataKey={series.dataKey}
                name={series.name}
                fill={series.color}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
