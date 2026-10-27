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
import type { MonthlyReportSummary } from "@/lib/types";

interface MonthlySummaryPanelProps {
  summary: MonthlyReportSummary;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  canGoPreviousMonth?: boolean;
  canGoNextMonth?: boolean;
  mapZoneSummaries?: MapZoneEnergyResult[] | null;
  mapZoneSummariesLoading?: boolean;
}

export function MonthlySummaryPanel({
  summary,
  onPreviousMonth,
  onNextMonth,
  canGoPreviousMonth = true,
  canGoNextMonth = true,
  mapZoneSummaries = null,
  mapZoneSummariesLoading = false,
}: MonthlySummaryPanelProps) {
  const mapFilterActive = isMapFilterActive(
    mapZoneSummaries,
    mapZoneSummariesLoading,
  );

  return (
    <Card className="border-brand-border bg-white">
      <CardHeader className="border-b border-brand-border/60 bg-brand-light/60">
        <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg text-brand-foreground">
          <span>Monthly Report Summary —</span>
          <PeriodNavigator
            label={summary.periodLabel}
            onPrevious={onPreviousMonth}
            onNext={onNextMonth}
            canGoPrevious={canGoPreviousMonth}
            canGoNext={canGoNextMonth}
          />
        </CardTitle>
        <p className="text-sm text-slate-600">
          Month total across {summary.daysInMonth} day
          {summary.daysInMonth === 1 ? "" : "s"}
        </p>
      </CardHeader>
      <CardContent className="min-w-0 space-y-6 pt-5">
        <PeriodContextCards
          periodContext={summary.context}
          gasKwh={summary.totals.gasKwh}
          gasUnits={summary.totals.gasUnits}
          electricityKwh={summary.totals.resortElectricityTotal}
          electricityLabel="Month Total Electricity Usage"
        />

        <SummaryBreakdownSection
          timePreset="month"
          from={summary.from}
          fullResortBreakdown={summary.totals}
          fullResortValueColumnLabel="Month total kWh / units"
          mapZoneSummaries={mapZoneSummaries}
          mapZoneSummariesLoading={mapZoneSummariesLoading}
        />

        {!mapFilterActive && (
          <PeriodExtremaCards
            highest={summary.highestDay}
            lowest={summary.lowestDay}
            highestLabel="Highest day of the month"
            lowestLabel="Lowest day of the month"
          />
        )}

        <p className="text-xs text-slate-400">
          Month totals sum daily executive-summary figures. Temperature,
          utilization, occupancy, sunshine, and rainfall are daily averages
          across the month. Gas consumption is the month total.
        </p>
      </CardContent>
    </Card>
  );
}
