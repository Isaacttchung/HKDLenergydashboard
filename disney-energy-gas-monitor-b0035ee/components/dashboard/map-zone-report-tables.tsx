"use client";

import { MapZoneSummaryTable } from "@/components/dashboard/map-zone-summary-table";
import { mapSelectionDataColumnLabel } from "@/lib/full-resort-data-label";
import type { MapZoneEnergyResult } from "@/lib/resort-map/aggregate-energy";
import type { TimePreset } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface MapZoneReportTablesProps {
  zones: MapZoneEnergyResult[];
  loading?: boolean;
  timePreset: TimePreset;
  from: string;
  to?: string;
  valueColumnLabel: string;
}

export function MapZoneReportTables({
  zones,
  loading,
  timePreset,
  from,
  to,
  valueColumnLabel,
}: MapZoneReportTablesProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-brand-border bg-brand-light/40 px-4 py-6 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading map selection data…
      </div>
    );
  }

  if (zones.length === 0) return null;

  return (
    <div className="space-y-4">
      {zones.map((zone) => (
        <MapZoneSummaryTable
          key={zone.zoneId}
          categoryColumnLabel={mapSelectionDataColumnLabel(
            zone.label,
            timePreset,
            from,
            to,
          )}
          valueColumnLabel={valueColumnLabel}
          totalKwh={zone.totalKwh}
          solarKwh={zone.solarKwh}
          solarSites={zone.solarSites}
          emptyMessage={zone.emptyMessage}
        />
      ))}
    </div>
  );
}
