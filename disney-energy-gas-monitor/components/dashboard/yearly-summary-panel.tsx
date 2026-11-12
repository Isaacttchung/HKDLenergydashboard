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
import type { YearlyReportSummary } from "@/lib/types";

interface YearlySummaryPanelProps {
  documentDownloadDate: string;
  summary: YearlyReportSummary;
  onPreviousYear: () => void;
  onNextYear: () => void;
  canGoPreviousYear?: boolean;
  canGoNextYear?: boolean;
  mapZoneSummaries?: MapZoneEnergyResult[] | null;
  mapZoneSummariesLoading?: boolean;
}

export function YearlySummaryPanel({
  documentDownloadDate,
  summary,
  onPreviousYear,
  onNextYear,
  canGoPreviousYear = true,
  canGoNextYear = true,
  mapZoneSummaries = null,
  mapZoneSummariesLoading = false,
}: YearlySummaryPanelProps) {
  return (
    <div className="space-y-3">
      <SummaryDownloadBar
        documentDownloadDate={documentDownloadDate}
        downloadsEnabled={false}
      />
      <Card className="border-brand-border bg-white">
        <SummaryPanelTitleInset>
          <SummaryPanelTitle
            title="Yearly Report Summary —"
            navigator={
              <PeriodNavigator
                label={summary.periodLabel}
                onPrevious={onPreviousYear}
                onNext={onNextYear}
                canGoPrevious={canGoPreviousYear}
                canGoNext={canGoNextYear}
              />
            }
            subtitle={`Year total across ${summary.daysInYear} day${summary.daysInYear === 1 ? "" : "s"}`}
          />
        </SummaryPanelTitleInset>
        <CardContent className="min-w-0 space-y-6 pt-4">
        <PeriodContextCards
          periodContext={summary.context}
          mobileFuels={summary.mobileFuels}
          gasKwh={summary.totals.gasKwh}
          gasUnits={summary.totals.gasUnits}
          electricityKwh={summary.totals.resortElectricityTotal}
          electricityLabel="Year Total Electricity Usage"
        />

        <SummaryBreakdownSection
          timePreset="ytd"
          from={summary.from}
          to={summary.to}
          fullResortBreakdown={summary.totals}
          fullResortValueColumnLabel="Year total kWh / units"
          mapZoneSummaries={mapZoneSummaries}
          mapZoneSummariesLoading={mapZoneSummariesLoading}
          resortGas={summary.resortGas}
        />

        <p className="text-xs text-slate-400">
          Year totals sum daily executive-summary figures. Temperature,
          utilization, occupancy, sunshine, and rainfall are daily averages
          across the year. Gas consumption is the year total.
        </p>
        </CardContent>
      </Card>
    </div>
  );
}
