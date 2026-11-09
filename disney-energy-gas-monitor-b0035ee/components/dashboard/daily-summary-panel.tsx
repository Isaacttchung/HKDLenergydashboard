"use client";

import { SummaryBreakdownSection } from "@/components/dashboard/summary-breakdown-section";
import {
  SummaryDownloadBar,
  SummaryPanelTitle,
  SummaryPanelTitleInset,
} from "@/components/dashboard/summary-panel-header";
import type { MapZoneEnergyResult } from "@/lib/resort-map/aggregate-energy";
import { PeriodContextCards } from "@/components/dashboard/period-context-cards";
import { PeriodNavigator } from "@/components/dashboard/period-navigator";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-3">
      <SummaryDownloadBar documentDownloadDate={date} downloadsEnabled />
      <Card className="border-brand-border bg-white">
        <SummaryPanelTitleInset>
          <SummaryPanelTitle
            title="Daily Report Summary —"
            navigator={
              <PeriodNavigator
                label={formatDateLabel(date)}
                onPrevious={onPreviousDay}
                onNext={onNextDay}
                canGoPrevious={canGoPreviousDay}
                canGoNext={canGoNextDay}
              />
            }
            subtitle={
              context?.reportTitle ??
              "Daily Power, Gas Consumption & Solar Energy Feed-in Tariff of HCCP, CCP, Hotel and Theme Park"
            }
          />
        </SummaryPanelTitleInset>
        <CardContent className="min-w-0 space-y-6 pt-4">
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
    </div>
  );
}
