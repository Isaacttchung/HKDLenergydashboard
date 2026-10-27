import { formatNumber } from "@/lib/utils";

export interface PeriodComparisonContextMetrics {
  outdoorTempC?: number;
  sunshineHours?: number;
  rainfallMm?: number;
  ballroomUtilizationPct?: number;
  hotelOccupancyPct?: number;
}

export interface ContextMetricRowDef {
  id: keyof PeriodComparisonContextMetrics;
  label: string;
  formatValue: (value: number) => string;
  decimals?: number;
}

export const PERIOD_CONTEXT_METRIC_ROWS: ContextMetricRowDef[] = [
  {
    id: "outdoorTempC",
    label: "Avg outdoor temperature",
    decimals: 1,
    formatValue: (v) => `${formatNumber(v, 1)} °C`,
  },
  {
    id: "sunshineHours",
    label: "Sunshine",
    decimals: 1,
    formatValue: (v) => `${formatNumber(v, 1)} hr`,
  },
  {
    id: "rainfallMm",
    label: "Rainfall",
    decimals: 1,
    formatValue: (v) => `${formatNumber(v, v % 1 === 0 ? 0 : 1)} mm`,
  },
  {
    id: "ballroomUtilizationPct",
    label: "Ballroom utilization",
    decimals: 0,
    formatValue: (v) => `${formatNumber(v, 0)}%`,
  },
  {
    id: "hotelOccupancyPct",
    label: "Overall hotel occupancy",
    decimals: 0,
    formatValue: (v) => `${formatNumber(v, 0)}%`,
  },
];
