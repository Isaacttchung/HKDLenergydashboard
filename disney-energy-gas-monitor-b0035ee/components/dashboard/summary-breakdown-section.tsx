"use client";

import { BreakdownSummaryTable } from "@/components/dashboard/breakdown-summary-table";
import { MapZoneReportTables } from "@/components/dashboard/map-zone-report-tables";
import { fullResortDataColumnLabel } from "@/lib/full-resort-data-label";
import type { MapZoneEnergyResult } from "@/lib/resort-map/aggregate-energy";
import type { DailyBreakdown, TimePreset } from "@/lib/types";

/** True when the report summary is scoped to map selection(s), not full resort. */
export function isMapFilterActive(
  mapZoneSummaries?: MapZoneEnergyResult[] | null,
  mapZoneSummariesLoading?: boolean,
): boolean {
  return Boolean(
    mapZoneSummariesLoading ||
      (mapZoneSummaries !== null && mapZoneSummaries !== undefined),
  );
}

interface SummaryBreakdownSectionProps {
  timePreset: TimePreset;
  from: string;
  to?: string;
  fullResortBreakdown: DailyBreakdown;
  fullResortValueColumnLabel: string;
  mapZoneSummaries?: MapZoneEnergyResult[] | null;
  mapZoneSummariesLoading?: boolean;
}

export function SummaryBreakdownSection({
  timePreset,
  from,
  to,
  fullResortBreakdown,
  fullResortValueColumnLabel,
  mapZoneSummaries,
  mapZoneSummariesLoading,
}: SummaryBreakdownSectionProps) {
  const useMapSelections =
    mapZoneSummariesLoading ||
    (mapZoneSummaries !== null &&
      mapZoneSummaries !== undefined &&
      mapZoneSummaries.length > 0);

  if (useMapSelections) {
    return (
      <MapZoneReportTables
        zones={mapZoneSummaries ?? []}
        loading={mapZoneSummariesLoading}
        timePreset={timePreset}
        from={from}
        to={to}
        valueColumnLabel={fullResortValueColumnLabel}
      />
    );
  }

  return (
    <BreakdownSummaryTable
      breakdown={fullResortBreakdown}
      categoryColumnLabel={fullResortDataColumnLabel(timePreset, from, to)}
      valueColumnLabel={fullResortValueColumnLabel}
    />
  );
}
