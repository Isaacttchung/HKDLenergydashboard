"use client";

import { Tooltip } from "recharts";
import { formatNumber } from "@/lib/utils";

export function formatChartKwhValue(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return formatNumber(Math.round(numeric));
}

export function ChartTooltip() {
  return <Tooltip formatter={(value) => formatChartKwhValue(value)} />;
}
