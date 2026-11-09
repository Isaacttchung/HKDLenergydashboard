"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "@/components/dashboard/chart-container";
import { formatChartKwhValue } from "@/components/dashboard/chart-tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  CcpComparisonAxis,
  CcpComparisonChart,
  CcpComparisonPanel,
  ParkVsHotelChartGranularity,
} from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface CcpComparisonChartProps {
  chart: CcpComparisonChart;
}

const PANEL_STYLES = {
  lastYear: {
    bar: "#1d70b8",
    line: "#ea580c",
    legendBar: "Sum CCP1",
  },
  thisYear: {
    bar: "#ca8a04",
    line: "#fcd34d",
    legendBar: "Sum CCP1",
  },
} as const;

function CcpPanelTooltip({
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
    ccpKwh?: number;
    outdoorTempC?: number;
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
          <span className="text-slate-700">CCP (kWh)</span>
          <span className="font-medium tabular-nums text-slate-900">
            {formatChartKwhValue(point?.ccpKwh ?? 0)} kWh
          </span>
        </div>
        {point?.outdoorTempC != null && Number.isFinite(point.outdoorTempC) ? (
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-700">Outdoor temp (°C)</span>
            <span className="font-medium tabular-nums text-slate-900">
              {point.outdoorTempC.toFixed(1)} °C
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CcpComparisonPanelChart({
  panel,
  axis,
  granularity,
}: {
  panel: CcpComparisonPanel;
  axis: CcpComparisonAxis;
  granularity: ParkVsHotelChartGranularity;
}) {
  const styles = PANEL_STYLES[panel.kind];
  const yearlySingleBar =
    granularity === "yearly" && panel.data.length === 1;
  const yearAvgTemp = yearlySingleBar
    ? panel.data[0]?.outdoorTempC
    : undefined;
  const dense =
    panel.data.length > 8 ||
    (panel.data.length > 4 && panel.data[0]?.period.includes("-"));

  return (
    <Card className="min-w-0 flex-1">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-base">{panel.title}</CardTitle>
        <p className="text-sm font-medium text-slate-600">
          {panel.dateRangeLabel}
        </p>
      </CardHeader>
      <CardContent className="min-w-0">
        <ChartContainer>
          <ComposedChart
            data={panel.data}
            margin={{ top: 24, right: 16, left: 8, bottom: dense ? 48 : 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: dense ? 10 : 12 }}
              angle={dense ? -45 : 0}
              textAnchor={dense ? "end" : "middle"}
              height={dense ? 56 : 30}
              interval={dense ? 0 : "preserveStartEnd"}
            />
            <YAxis
              yAxisId="kwh"
              orientation="left"
              domain={[0, axis.leftMax]}
              ticks={axis.leftTicks}
              tick={{ fontSize: 11 }}
              width={64}
              tickFormatter={(v) => Number(v).toLocaleString()}
            />
            <YAxis
              yAxisId="temp"
              orientation="right"
              domain={[0, axis.rightMax]}
              ticks={axis.rightTicks}
              tick={{ fontSize: 11 }}
              width={44}
              tickFormatter={(v) => Number(v).toFixed(1)}
              label={{
                value: "°C",
                angle: 90,
                position: "insideRight",
                style: { fontSize: 11, fill: "#64748b" },
              }}
            />
            <Tooltip content={<CcpPanelTooltip />} />
            <Bar
              yAxisId="kwh"
              dataKey="ccpKwh"
              name={styles.legendBar}
              fill={styles.bar}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="ccpKwh"
                position="top"
                formatter={(value) =>
                  formatNumber(Math.round(Number(value ?? 0)))
                }
                className="fill-slate-700 text-[10px]"
              />
            </Bar>
            {yearlySingleBar &&
            yearAvgTemp != null &&
            Number.isFinite(yearAvgTemp) ? (
              <ReferenceLine
                yAxisId="temp"
                y={yearAvgTemp}
                stroke={styles.line}
                strokeWidth={2.5}
                ifOverflow="extendDomain"
              />
            ) : null}
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="outdoorTempC"
              name="degC"
              stroke={styles.line}
              strokeWidth={2.5}
              dot={
                yearlySingleBar
                  ? false
                  : { r: 4, fill: "#fff", stroke: styles.line, strokeWidth: 2 }
              }
              hide={yearlySingleBar}
              legendType="line"
              connectNulls
              isAnimationActive={false}
            />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function CcpComparisonChartPanel({ chart }: CcpComparisonChartProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CcpComparisonPanelChart
        panel={chart.leftPanel}
        axis={chart.axis}
        granularity={chart.granularity}
      />
      <CcpComparisonPanelChart
        panel={chart.rightPanel}
        axis={chart.axis}
        granularity={chart.granularity}
      />
    </div>
  );
}
