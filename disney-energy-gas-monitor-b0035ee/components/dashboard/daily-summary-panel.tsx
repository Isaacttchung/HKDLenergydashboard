"use client";

import { DownloadDailyReportButton } from "@/components/dashboard/download-daily-report-button";
import { SummaryBreakdownSection } from "@/components/dashboard/summary-breakdown-section";
import type { MapZoneEnergyResult } from "@/lib/resort-map/aggregate-energy";
import { PeriodContextCards } from "@/components/dashboard/period-context-cards";
import { PeriodNavigator } from "@/components/dashboard/period-navigator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyContext } from "@/lib/daily-context";
import type { DailyBreakdown } from "@/lib/types";

interface DailySummaryPanelProps {
  date: string;
  context: DailyContext | null;
  breakdown: DailyBreakdown;
  onPreviousDay: () => void;
  onNextDay: () => void;
  canGoPreviousDay?: boolean;
  canGoNextDay?: boolean;
  mapZoneSummaries?: MapZoneEnergyResult[] | null;
  mapZoneSummariesLoading?: boolean;
}

function formatDateLabel(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DailySummaryPanel({
  date,
  context,
  breakdown,
  onPreviousDay,
  onNextDay,
  canGoPreviousDay = true,
  canGoNextDay = true,
  mapZoneSummaries = null,
  mapZoneSummariesLoading = false,
}: DailySummaryPanelProps) {
  return (
    <Card className="border-brand-border bg-white">
      <CardHeader className="border-b border-brand-border/60 bg-brand-light/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg text-brand-foreground">
              <span>Daily Report Summary —</span>
              <PeriodNavigator
                label={formatDateLabel(date)}
                onPrevious={onPreviousDay}
                onNext={onNextDay}
                canGoPrevious={canGoPreviousDay}
                canGoNext={canGoNextDay}
              />
            </CardTitle>
            <p className="text-sm text-slate-600">
              {context?.reportTitle ??
                "Daily Power, Gas Consumption & Solar Energy Feed-in Tariff of HCCP, CCP, Hotel and Theme Park"}
            </p>
          </div>
          <DownloadDailyReportButton
            date={date}
            className="shrink-0 border-brand-border bg-white"
          />
        </div>
      </CardHeader>
      <CardContent className="min-w-0 space-y-6 pt-5">
        <PeriodContextCards
          dailyContext={context}
          gasKwh={breakdown.gasKwh}
          gasUnits={breakdown.gasUnits}
          electricityKwh={breakdown.resortElectricityTotal}
          electricityLabel="Total Electricity Usage"
        />

        <SummaryBreakdownSection
          timePreset="day"
          from={date}
          fullResortBreakdown={breakdown}
          fullResortValueColumnLabel="kWh"
          mapZoneSummaries={mapZoneSummaries}
          mapZoneSummariesLoading={mapZoneSummariesLoading}
        />

        {context?.yoyChangePct !== undefined && (
          <p className="text-sm text-slate-700">
            Total daily power consumption for resort-wide{" "}
            {context.yoyChangePct >= 0 ? "increased" : "decreased"}{" "}
            <strong>{Math.abs(context.yoyChangePct)}%</strong> compared with the
            previous year.
          </p>
        )}

        {context?.notes && context.notes.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            {context.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
