"use client";

import { SummaryBreakdownSection } from "@/components/dashboard/summary-breakdown-section";
import type { MapZoneEnergyResult } from "@/lib/resort-map/aggregate-energy";
import { PeriodContextCards } from "@/components/dashboard/period-context-cards";
import { PeriodNavigator } from "@/components/dashboard/period-navigator";
import {
  SummaryDownloadBar,
  SummaryPanelTitle,
  SummaryPanelTitleInset,
} from "@/components/dashboard/summary-panel-header";
import { Card, CardContent } from "@/components/ui/card";
import type { MonthlyReportSummary } from "@/lib/types";

interface MonthlySummaryPanelProps {
  documentDownloadDate: string;
  summary: MonthlyReportSummary;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  canGoPreviousMonth?: boolean;
  canGoNextMonth?: boolean;
  mapZoneSummaries?: MapZoneEnergyResult[] | null;
  mapZoneSummariesLoading?: boolean;
}

export function MonthlySummaryPanel({
  documentDownloadDate,
  summary,
  onPreviousMonth,
  onNextMonth,
  canGoPreviousMonth = true,
  canGoNextMonth = true,
  mapZoneSummaries = null,
  mapZoneSummariesLoading = false,
}: MonthlySummaryPanelProps) {
  return (
    <div className="space-y-3">
      <SummaryDownloadBar
        documentDownloadDate={documentDownloadDate}
        downloadsEnabled={false}
      />
      <Card className="border-brand-border bg-white">
        <SummaryPanelTitleInset>
          <SummaryPanelTitle
            title="Monthly Report Summary —"
            navigator={
              <PeriodNavigator
                label={summary.periodLabel}
                onPrevious={onPreviousMonth}
                onNext={onNextMonth}
                canGoPrevious={canGoPreviousMonth}
                canGoNext={canGoNextMonth}
              />
            }
            subtitle={`Month total across ${summary.daysInMonth} day${summary.daysInMonth === 1 ? "" : "s"}`}
          />
        </SummaryPanelTitleInset>
        <CardContent className="min-w-0 space-y-6 pt-4">
        <PeriodContextCards
          periodContext={summary.context}
          mobileFuels={summary.mobileFuels}
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
          resortGas={summary.resortGas}
        />

        <p className="text-xs text-slate-400">
          Month totals sum daily executive-summary figures. Temperature,
          utilization, occupancy, sunshine, and rainfall are daily averages
          across the month. Gas consumption is the month total.
        </p>
        </CardContent>
      </Card>
    </div>
  );
}
