export type CustomGraphUnit =
  | "kwh"
  | "gas_units"
  | "celsius"
  | "percent"
  | "hours"
  | "mm";

export interface CustomGraphSeriesDefinition {
  id: string;
  label: string;
  category: string;
  unit: CustomGraphUnit;
  unitLabel: string;
}

export interface CustomGraphSeriesMeta {
  id: string;
  label: string;
  unit: CustomGraphUnit;
  unitLabel: string;
  color: string;
  /** One Y-axis per unit so °C, %, and mm are not squashed on a shared scale. */
  yAxisId: CustomGraphUnit;
}

export interface CustomGraphDataPoint {
  period: string;
  label: string;
  [valueKey: string]: string | number | null | undefined;
}

export interface CustomGraphAxisConfig {
  unit: CustomGraphUnit;
  label: string;
  min: number;
  max: number;
  ticks: number[];
  orientation: "left" | "right";
}

export interface CustomGraphChartPayload {
  from: string;
  to: string;
  granularity: "daily" | "monthly" | "yearly";
  series: CustomGraphSeriesMeta[];
  data: CustomGraphDataPoint[];
  axes: CustomGraphAxisConfig[];
}
