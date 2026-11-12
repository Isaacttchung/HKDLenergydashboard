"use client";

import { SummaryBreakdownSection } from "@/components/dashboard/summary-breakdown-section";
import type { MapZoneEnergyResult } from "@/lib/resort-map/aggregate-energy";
import { PeriodContextCards } from "@/components/dashboard/period-context-cards";
import {
  SummaryDownloadBar,
  SummaryPanelTitle,
  SummaryPanelTitleInset,
} from "@/components/dashboard/summary-panel-header";
import { Card, CardContent } from "@/components/ui/card";
import type { CustomRangeReportSummary } from "@/lib/types";

interface CustomRangeSummaryPanelProps {
  documentDownloadDate: string;
  summary: CustomRangeReportSummary;
  mapZoneSummaries?: MapZoneEnergyResult[] | null;
  mapZoneSummariesLoading?: boolean;
}

export function CustomRangeSummaryPanel({
  documentDownloadDate,
  summary,
  mapZoneSummaries = null,
  mapZoneSummariesLoading = false,
}: CustomRangeSummaryPanelProps) {
  return (
    <div className="space-y-3">
      <SummaryDownloadBar
        documentDownloadDate={documentDownloadDate}
        downloadsEnabled={false}
      />
      <Card className="border-brand-border bg-white">
        <SummaryPanelTitleInset>
          <SummaryPanelTitle
            title={`Custom Range Report Summary — ${summary.periodLabel}`}
            subtitle={`Range total across ${summary.daysInRange} day${summary.daysInRange === 1 ? "" : "s"}`}
          />
        </SummaryPanelTitleInset>
        <CardContent className="min-w-0 space-y-6 pt-4">
        <PeriodContextCards
          periodContext={summary.context}
          mobileFuels={summary.mobileFuels}
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
          resortGas={summary.resortGas}
        />

        <p className="text-xs text-slate-400">
          Range totals sum daily executive-summary figures. Temperature,
          utilization, occupancy, and sunshine are daily averages across the
          selected dates. Gas consumption is the period total.
        </p>
        </CardContent>
      </Card>
    </div>
  );
}
