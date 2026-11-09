"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MetricView, TimePreset } from "@/lib/types";

interface MetricViewTabsProps {
  value: MetricView;
  onChange: (value: MetricView) => void;
  timePreset: TimePreset;
}

const METRICS: { value: MetricView; label: string }[] = [
  { value: "electricity", label: "Electricity" },
  { value: "gas", label: "Gas" },
  { value: "compare", label: "Elec vs Gas" },
  { value: "park-vs-hotel", label: "Park vs Hotel" },
  { value: "hotels-kwh", label: "Hotels kWh" },
  { value: "hccp-gas", label: "HCCP Gas" },
  { value: "solar", label: "Solar" },
  { value: "ccp-kwh", label: "CCP kWh" },
  { value: "top-10", label: "Top 10" },
  { value: "custom", label: "Custom" },
];

export function MetricViewTabs({ value, onChange }: MetricViewTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as MetricView)}>
      <TabsList className="w-full justify-start overflow-x-auto">
        {METRICS.map((metric) => (
          <TabsTrigger key={metric.value} value={metric.value}>
            {metric.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
