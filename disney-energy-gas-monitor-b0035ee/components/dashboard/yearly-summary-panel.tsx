"use client";

import {
  isMapFilterActive,
  SummaryBreakdownSection,
} from "@/components/dashboard/summary-breakdown-section";
import type { MapZoneEnergyResult } from "@/lib/resort-map/aggregate-energy";
import { PeriodContextCards } from "@/components/dashboard/period-context-cards";
import { PeriodNavigator } from "@/components/dashboard/period-navigator";
import { PeriodExtremaCards } from "@/components/dashboard/period-extrema-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { YearlyReportSummary } from "@/lib/types";

interface YearlySummaryPanelProps {
  summary: YearlyReportSummary;
  onPreviousYear: () => void;
  onNextYear: () => void;
  canGoPreviousYear?: boolean;
  canGoNextYear?: boolean;
  mapZoneSummaries?: MapZoneEnergyResult[] | null;
  mapZoneSummariesLoading?: boolean;
}

export function YearlySummaryPanel({
  summary,
  onPreviousYear,
  onNextYear,
  canGoPreviousYear = true,
  canGoNextYear = true,
  mapZoneSummaries = null,
  mapZoneSummariesLoading = false,
}: YearlySummaryPanelProps) {
  const mapFilterActive = isMapFilterActive(
    mapZoneSummaries,
    mapZoneSummariesLoading,
  );

  return (
    <Card className="border-brand-border bg-white">
      <CardHeader className="border-b border-brand-border/60 bg-brand-light/60">
        <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg text-brand-foreground">
          <span>Yearly Report Summary —</span>
          <PeriodNavigator
            label={summary.periodLabel}
            onPrevious={onPreviousYear}
            onNext={onNextYear}
            canGoPrevious={canGoPreviousYear}
            canGoNext={canGoNextYear}
          />
        </CardTitle>
        <p className="text-sm text-slate-600">
          Year total across {summary.daysInYear} day
          {summary.daysInYear === 1 ? "" : "s"}
        </p>
      </CardHeader>
      <CardContent className="min-w-0 space-y-6 pt-5">
        <PeriodContextCards
          periodContext={summary.context}
          gasKwh={summary.totals.gasKwh}
          gasUnits={summary.totals.gasUnits}
          electricityKwh={summary.totals.resortElectricityTotal}
          electricityLabel="Year Total Electricity Usage"
        />

        <SummaryBreakdownSection
          timePreset="ytd"
          from={summary.from}
          fullResortBreakdown={summary.totals}
          fullResortValueColumnLabel="Year total kWh / units"
          mapZoneSummaries={mapZoneSummaries}
          mapZoneSummariesLoading={mapZoneSummariesLoading}
        />

        {!mapFilterActive && (
          <PeriodExtremaCards
            highest={summary.highestMonth}
            lowest={summary.lowestMonth}
            highestLabel="Highest month of the year"
            lowestLabel="Lowest month of the year"
          />
        )}

        <p className="text-xs text-slate-400">
          Year totals sum daily executive-summary figures. Temperature,
          utilization, occupancy, sunshine, and rainfall are daily averages
          across the year. Gas consumption is the year total.
        </p>
      </CardContent>
    </Card>
  );
}
