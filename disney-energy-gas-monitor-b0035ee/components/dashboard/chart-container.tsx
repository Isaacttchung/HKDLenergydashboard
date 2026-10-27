"use client";

import { ResponsiveContainer } from "recharts";

export const CHART_HEIGHT = 320;

interface ChartContainerProps {
  children: React.ReactElement;
  height?: number;
}

export function ChartContainer({
  children,
  height = CHART_HEIGHT,
}: ChartContainerProps) {
  return (
    <div
      className="w-full min-w-0"
      style={{ height, minHeight: height }}
    >
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
