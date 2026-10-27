"use client";

import {
  isMapFilterActive,
  SummaryBreakdownSection,
} from "@/components/dashboard/summary-breakdown-section";
import type { MapZoneEnergyResult } from "@/lib/resort-map/aggregate-energy";
import { PeriodContextCards } from "@/components/dashboard/period-context-cards";
import { PeriodExtremaCards } from "@/components/dashboard/period-extrema-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CustomRangeReportSummary } from "@/lib/types";

interface CustomRangeSummaryPanelProps {
  summary: CustomRangeReportSummary;
  mapZoneSummaries?: MapZoneEnergyResult[] | null;
  mapZoneSummariesLoading?: boolean;
}

export function CustomRangeSummaryPanel({
  summary,
  mapZoneSummaries = null,
  mapZoneSummariesLoading = false,
}: CustomRangeSummaryPanelProps) {
  const mapFilterActive = isMapFilterActive(
    mapZoneSummaries,
    mapZoneSummariesLoading,
  );

  return (
    <Card className="border-brand-border bg-white">
      <CardHeader className="border-b border-brand-border/60 bg-brand-light/60">
        <CardTitle className="text-lg text-brand-foreground">
          Custom Range Report Summary — {summary.periodLabel}
        </CardTitle>
        <p className="text-sm text-slate-600">
          Range total across {summary.daysInRange} day
          {summary.daysInRange === 1 ? "" : "s"}
        </p>
      </CardHeader>
      <CardContent className="min-w-0 space-y-6 pt-5">
        <PeriodContextCards
          periodContext={summary.context}
          gasKwh={summary.totals.gasKwh}
          gasUnits={summary.totals.gasUnits}
          electricityKwh={summary.totals.resortElectricityTotal}
          electricityLabel="Range Total Electricity Usage"
        />

        <SummaryBreakdownSection
          timePreset="custom"
          from={summary.from}
          to={summary.to}
          fullResortBreakdown={summary.totals}
          fullResortValueColumnLabel="Range total kWh / units"
          mapZoneSummaries={mapZoneSummaries}
          mapZoneSummariesLoading={mapZoneSummariesLoading}
        />

        {!mapFilterActive && (
          <PeriodExtremaCards
            highest={summary.highestDay}
            lowest={summary.lowestDay}
            highestLabel="Highest day in range"
            lowestLabel="Lowest day in range"
          />
        )}

        <p className="text-xs text-slate-400">
          Range totals sum daily executive-summary figures. Temperature,
          utilization, occupancy, and sunshine are daily averages across the
          selected dates. Gas consumption is the period total.
        </p>
      </CardContent>
    </Card>
  );
}
