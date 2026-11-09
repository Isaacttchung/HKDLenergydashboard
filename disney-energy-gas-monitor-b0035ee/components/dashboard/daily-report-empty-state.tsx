"use client";

import { PeriodNavigator } from "@/components/dashboard/period-navigator";
import {
  SummaryDownloadBar,
  SummaryPanelTitle,
  SummaryPanelTitleInset,
} from "@/components/dashboard/summary-panel-header";
import { Card, CardContent } from "@/components/ui/card";

interface DailyReportEmptyStateProps {
  date: string;
  latestAvailableDate: string;
  onPreviousDay: () => void;
  onNextDay: () => void;
  canGoPreviousDay?: boolean;
  canGoNextDay?: boolean;
}

function formatDateLabel(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DailyReportEmptyState({
  date,
  latestAvailableDate,
  onPreviousDay,
  onNextDay,
  canGoPreviousDay = true,
  canGoNextDay = true,
}: DailyReportEmptyStateProps) {
  const isBeyondLatest = date > latestAvailableDate;

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
          />
        </SummaryPanelTitleInset>
        <CardContent className="py-10 text-center text-sm text-slate-600">
        {isBeyondLatest ? (
          <p>
            No daily EMS report is available for this date yet. The latest
            complete report is{" "}
            <strong className="text-brand-foreground">
              {formatDateLabel(latestAvailableDate)}
            </strong>
            .
          </p>
        ) : (
          <p>
            No daily EMS report is available for{" "}
            <strong className="text-brand-foreground">
              {formatDateLabel(date)}
            </strong>
            . Choose another day or upload updated master sheets.
          </p>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
