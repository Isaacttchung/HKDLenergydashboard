"use client";

import { DownloadDailyReportButton } from "@/components/dashboard/download-daily-report-button";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SINGLE_DAY_DOWNLOADS_MESSAGE } from "@/lib/download-single-day-guard";
import {
  buildSourceDownloadUrl,
  MASTER_SHEET_DOWNLOAD_ITEMS,
  RAW_DATA_DOWNLOAD_ITEMS,
  type SourceDownloadItem,
} from "@/lib/source-file-download-catalog";
import { cn } from "@/lib/utils";
import { ChevronDown, Download } from "lucide-react";
import { useCallback, useState } from "react";

const UPLOAD_TOKEN_STORAGE_KEY = "hkdl-upload-token";

interface ReportDocumentDownloadsProps {
  date: string;
  downloadsEnabled: boolean;
  className?: string;
}

function readUploadToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return sessionStorage.getItem(UPLOAD_TOKEN_STORAGE_KEY)?.trim() || undefined;
}

async function downloadSourceFile(item: SourceDownloadItem, reportDate: string) {
  const url = buildSourceDownloadUrl(item, reportDate, readUploadToken());
  const response = await fetch(url);
  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    window.alert(
      json.error ??
        "File not available for this date. Upload Option A raw data for that day first.",
    );
    return;
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? item.label;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function SourceFileDropdown({
  label,
  items,
  reportDate,
  downloadsEnabled,
}: {
  label: string;
  items: SourceDownloadItem[];
  reportDate: string;
  downloadsEnabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  const guardOpen = useCallback(
    (next: boolean) => {
      if (next && !downloadsEnabled) {
        window.alert(SINGLE_DAY_DOWNLOADS_MESSAGE);
        return;
      }
      setOpen(next);
    },
    [downloadsEnabled],
  );

  return (
    <Popover open={open} onOpenChange={guardOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1 border-brand-border bg-white"
        >
          {label}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-[min(24rem,70vh)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-2"
      >
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <button
                type="button"
                className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-brand-light/80"
                onClick={() => {
                  if (!downloadsEnabled) {
                    window.alert(SINGLE_DAY_DOWNLOADS_MESSAGE);
                    return;
                  }
                  void downloadSourceFile(item, reportDate);
                }}
              >
                <Download
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-muted"
                  aria-hidden
                />
                <span className="break-words font-mono leading-snug text-slate-800">
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function ReportDocumentDownloads({
  date,
  downloadsEnabled,
  className,
}: ReportDocumentDownloadsProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center justify-start gap-2", className)}
    >
      <DownloadDailyReportButton
        date={date}
        downloadsEnabled={downloadsEnabled}
        className="shrink-0 border-brand-border bg-white"
      />
      <SourceFileDropdown
        label="Download Excel Mastersheets"
        items={MASTER_SHEET_DOWNLOAD_ITEMS}
        reportDate={date}
        downloadsEnabled={downloadsEnabled}
      />
      <SourceFileDropdown
        label="Download Rawdata CSVs"
        items={RAW_DATA_DOWNLOAD_ITEMS}
        reportDate={date}
        downloadsEnabled={downloadsEnabled}
      />
    </div>
  );
}

export { UPLOAD_TOKEN_STORAGE_KEY };
