"use client";

import { ReportDocumentDownloads } from "@/components/dashboard/report-document-downloads";
import { CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

interface SummaryDownloadBarProps {
  documentDownloadDate: string;
  downloadsEnabled: boolean;
}

/** Standalone row above the summary card (not inside the white report box). */
export function SummaryDownloadBar({
  documentDownloadDate,
  downloadsEnabled,
}: SummaryDownloadBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-start gap-2 rounded-xl border border-brand-border/60 bg-white px-4 py-2.5 shadow-sm">
      <ReportDocumentDownloads
        date={documentDownloadDate}
        downloadsEnabled={downloadsEnabled}
      />
    </div>
  );
}

interface SummaryPanelTitleProps {
  title: string;
  subtitle?: ReactNode;
  navigator?: ReactNode;
}

/** Inset padding so the title bubble sits inside the report card, not edge-to-edge. */
export function SummaryPanelTitleInset({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="px-5 pt-5">{children}</div>;
}

/** Rounded title bubble (place inside {@link SummaryPanelTitleInset}). */
export function SummaryPanelTitle({
  title,
  subtitle,
  navigator,
}: SummaryPanelTitleProps) {
  return (
    <div className="space-y-1 rounded-xl border border-brand-border/60 bg-brand-light/60 px-5 py-4 shadow-sm">
      <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-semibold text-brand-foreground">
        <span>{title}</span>
        {navigator}
      </CardTitle>
      {subtitle ? (
        <p className="text-sm text-slate-600">{subtitle}</p>
      ) : null}
    </div>
  );
}
