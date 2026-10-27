import type { CustomGraphSeriesDefinition } from "@/lib/custom-graph/types";

/** Fixed resort series available in the custom graph picker (Top 10 meters omitted for v1). */
export const CUSTOM_GRAPH_SERIES: CustomGraphSeriesDefinition[] = [
  {
    id: "park",
    label: "Theme Park electricity",
    category: "Electricity (kWh)",
    unit: "kwh",
    unitLabel: "kWh",
  },
  {
    id: "ccp",
    label: "CCP electricity",
    category: "Electricity (kWh)",
    unit: "kwh",
    unitLabel: "kWh",
  },
  {
    id: "hccp",
    label: "HCCP electricity",
    category: "Electricity (kWh)",
    unit: "kwh",
    unitLabel: "kWh",
  },
  {
    id: "csb",
    label: "CSB electricity (HCCP sheet)",
    category: "Electricity (kWh)",
    unit: "kwh",
    unitLabel: "kWh",
  },
  {
    id: "dhh",
    label: "DHH electricity",
    category: "Electricity (kWh)",
    unit: "kwh",
    unitLabel: "kWh",
  },
  {
    id: "dlh",
    label: "DLH electricity",
    category: "Electricity (kWh)",
    unit: "kwh",
    unitLabel: "kWh",
  },
  {
    id: "del",
    label: "DEL electricity",
    category: "Electricity (kWh)",
    unit: "kwh",
    unitLabel: "kWh",
  },
  {
    id: "hotel-total",
    label: "Hotels electricity total (DHH+DLH+DEL)",
    category: "Electricity (kWh)",
    unit: "kwh",
    unitLabel: "kWh",
  },
  {
    id: "resort-electricity",
    label: "Resort electricity total",
    category: "Electricity (kWh)",
    unit: "kwh",
    unitLabel: "kWh",
  },
  {
    id: "gas-units",
    label: "Gas consumption (meter units)",
    category: "Gas consumption",
    unit: "gas_units",
    unitLabel: "Units",
  },
  {
    id: "resort-gas-kwh",
    label: "Gas consumption (kWh)",
    category: "Gas consumption",
    unit: "kwh",
    unitLabel: "kWh",
  },
  {
    id: "solar-total",
    label: "Solar generation total (feed-in)",
    category: "Solar generation (kWh)",
    unit: "kwh",
    unitLabel: "kWh",
  },
  {
    id: "outdoor-temp",
    label: "Outdoor air temperature",
    category: "Weather & occupancy",
    unit: "celsius",
    unitLabel: "°C",
  },
  {
    id: "ballroom",
    label: "Ballroom utilization",
    category: "Weather & occupancy",
    unit: "percent",
    unitLabel: "%",
  },
  {
    id: "hotel-occupancy",
    label: "Overall hotel occupancy",
    category: "Weather & occupancy",
    unit: "percent",
    unitLabel: "%",
  },
  {
    id: "dhh-occupancy",
    label: "DHH occupancy",
    category: "Weather & occupancy",
    unit: "percent",
    unitLabel: "%",
  },
  {
    id: "dlh-occupancy",
    label: "DLH occupancy",
    category: "Weather & occupancy",
    unit: "percent",
    unitLabel: "%",
  },
  {
    id: "del-occupancy",
    label: "DEL occupancy",
    category: "Weather & occupancy",
    unit: "percent",
    unitLabel: "%",
  },
  {
    id: "sunshine",
    label: "Sunshine hours",
    category: "Weather & occupancy",
    unit: "hours",
    unitLabel: "hr",
  },
  {
    id: "rainfall",
    label: "Rainfall",
    category: "Weather & occupancy",
    unit: "mm",
    unitLabel: "mm",
  },
];

const catalogById = new Map(
  CUSTOM_GRAPH_SERIES.map((series) => [series.id, series]),
);

export function getCustomGraphSeriesDefinition(
  id: string,
): CustomGraphSeriesDefinition | undefined {
  return catalogById.get(id);
}

export function listCustomGraphCatalog(): CustomGraphSeriesDefinition[] {
  return CUSTOM_GRAPH_SERIES;
}
