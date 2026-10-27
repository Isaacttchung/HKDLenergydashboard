"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface DownloadDailyReportButtonProps {
  date: string;
  className?: string;
}

export function DownloadDailyReportButton({
  date,
  className,
}: DownloadDailyReportButtonProps) {
  async function handleDownload() {
    const url = `/api/daily-report/pdf?date=${encodeURIComponent(date)}`;
    const response = await fetch(url);
    if (!response.ok) {
      const message =
        response.status === 404
          ? "No daily report is available for this date."
          : "Could not generate the daily report PDF.";
      window.alert(message);
      return;
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `HKDL-Daily-Report-${date}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={() => {
        void handleDownload();
      }}
      aria-label={`Download daily report for ${date}`}
    >
      <Download className="h-4 w-4" aria-hidden />
      Download Daily Report
    </Button>
  );
}
