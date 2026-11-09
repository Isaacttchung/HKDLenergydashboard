"use client";

import { CustomGraphTooltip } from "@/components/dashboard/custom-graph/custom-graph-tooltip";
import { ChartContainer } from "@/components/dashboard/chart-container";
import type {
  CustomGraphChartPayload,
  CustomGraphUnit,
} from "@/lib/custom-graph/types";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CustomGraphChartProps {
  chart: CustomGraphChartPayload;
  height?: number;
}

export function CustomGraphChart({ chart, height = 300 }: CustomGraphChartProps) {
  const dense = chart.data.length > 14;
  const leftAxes = chart.axes.filter((axis) => axis.orientation === "left");
  const rightAxes = chart.axes.filter((axis) => axis.orientation === "right");
  const multipleRightUnits = rightAxes.length > 1;

  const rightMargin = rightAxes.length === 0 ? 12 : multipleRightUnits ? 56 : 48;

  const combinedRightLabel = rightAxes.map((axis) => axis.label).join(" · ");

  return (
    <div className="w-full min-w-0">
      {multipleRightUnits && (
        <p className="mb-1 text-right text-[10px] leading-snug text-slate-500">
          Right scales (per series): {combinedRightLabel}
        </p>
      )}
      <ChartContainer height={height}>
      <ComposedChart
        data={chart.data}
        margin={{
          top: 8,
          right: rightMargin,
          left: 8,
          bottom: dense ? 48 : 8,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: dense ? 10 : 12 }}
          angle={dense ? -45 : 0}
          textAnchor={dense ? "end" : "middle"}
          height={dense ? 56 : 30}
          interval={dense ? "preserveStartEnd" : 0}
        />
        {chart.axes.map((axis) => {
          const yAxisId = axis.unit as CustomGraphUnit;
          const isRight = axis.orientation === "right";
          const rightIndex = isRight
            ? rightAxes.indexOf(axis)
            : 0;
          const showRightTicks = isRight && (!multipleRightUnits || rightIndex === 0);

          return (
            <YAxis
              key={yAxisId}
              yAxisId={yAxisId}
              orientation={axis.orientation}
              domain={[axis.min, axis.max]}
              ticks={axis.ticks}
              width={
                !isRight
                  ? 68
                  : showRightTicks
                    ? 48
                    : 0
              }
              tick={
                !isRight || showRightTicks
                  ? { fontSize: 10, fill: "#475569" }
                  : false
              }
              axisLine={!isRight || showRightTicks}
              tickLine={!isRight || showRightTicks}
              tickFormatter={(v) => {
                if (isRight && !showRightTicks) return "";
                const n = Number(v);
                if (axis.unit === "percent") return `${n}`;
                if (axis.unit === "celsius") return `${n}°`;
                return n.toLocaleString();
              }}
              label={
                !isRight && leftAxes[0]?.unit === axis.unit
                  ? {
                      value: axis.label,
                      angle: -90,
                      position: "insideLeft",
                      offset: 12,
                      style: { fontSize: 10, fill: "#64748b", textAnchor: "middle" },
                    }
                  : showRightTicks && !multipleRightUnits
                    ? {
                        value: axis.label,
                        angle: 90,
                        position: "insideRight",
                        offset: 8,
                        style: { fontSize: 10, fill: "#64748b", textAnchor: "middle" },
                      }
                    : undefined
              }
            />
          );
        })}
        <Tooltip
          content={<CustomGraphTooltip />}
          wrapperStyle={{ zIndex: 1000, outline: "none" }}
        />
        <Legend wrapperStyle={{ fontSize: 11, zIndex: 1 }} />
        {chart.series.map((meta) => (
          <Line
            key={meta.id}
            yAxisId={meta.yAxisId}
            type="monotone"
            dataKey={meta.id}
            name={meta.label}
            stroke={meta.color}
            strokeWidth={2}
            dot={{ r: 2, fill: "#fff", stroke: meta.color, strokeWidth: 1.5 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </ComposedChart>
    </ChartContainer>
    </div>
  );
}
