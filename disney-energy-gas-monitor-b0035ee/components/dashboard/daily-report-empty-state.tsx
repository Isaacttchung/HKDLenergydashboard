"use client";

import { DownloadDailyReportButton } from "@/components/dashboard/download-daily-report-button";
import { PeriodNavigator } from "@/components/dashboard/period-navigator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card className="border-brand-border bg-white">
      <CardHeader className="border-b border-brand-border/60 bg-brand-light/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-lg text-brand-foreground">
            <span>Daily Report Summary —</span>
            <PeriodNavigator
              label={formatDateLabel(date)}
              onPrevious={onPreviousDay}
              onNext={onNextDay}
              canGoPrevious={canGoPreviousDay}
              canGoNext={canGoNextDay}
            />
          </CardTitle>
          <DownloadDailyReportButton
            date={date}
            className="shrink-0 border-brand-border bg-white"
          />
        </div>
      </CardHeader>
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
  );
}
