"use client";

import { DownloadDailyReportButton } from "@/components/dashboard/download-daily-report-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ChevronDown, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const UPLOAD_TOKEN_STORAGE_KEY = "hkdl-upload-token";

interface ReportDocumentDownloadsProps {
  date: string;
  downloadsEnabled: boolean;
  className?: string;
}

function itemKey(item: SourceDownloadItem): string {
  return `${item.kind}-${item.id}`;
}

function readUploadToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return sessionStorage.getItem(UPLOAD_TOKEN_STORAGE_KEY)?.trim() || undefined;
}

type FetchSourceResult =
  | { ok: true; blob: Blob; filename: string }
  | { ok: false; label: string; error: string };

async function fetchSourceFile(
  item: SourceDownloadItem,
  reportDate: string,
): Promise<FetchSourceResult> {
  const url = buildSourceDownloadUrl(item, reportDate, readUploadToken());
  const response = await fetch(url);
  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    return {
      ok: false,
      label: item.label,
      error:
        json.error ??
        "File not available for this date. Upload Option A raw data for that day first.",
    };
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? item.label;
  return { ok: true, blob, filename };
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

async function downloadSelectedFiles(
  items: SourceDownloadItem[],
  selectedKeys: Set<string>,
  reportDate: string,
): Promise<void> {
  const queue = items.filter((item) => selectedKeys.has(itemKey(item)));
  const failures: string[] = [];
  for (const item of queue) {
    const result = await fetchSourceFile(item, reportDate);
    if (result.ok) {
      triggerBrowserDownload(result.blob, result.filename);
      await new Promise((resolve) => setTimeout(resolve, 200));
    } else {
      failures.push(`${result.label}: ${result.error}`);
    }
  }
  if (failures.length > 0) {
    const preview = failures.slice(0, 5).join("\n");
    const more =
      failures.length > 5 ? `\n…and ${failures.length - 5} more.` : "";
    window.alert(
      failures.length === queue.length
        ? `No files could be downloaded.\n\n${preview}${more}`
        : `Some files could not be downloaded:\n\n${preview}${more}`,
    );
  }
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
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [downloading, setDownloading] = useState(false);

  const allKeys = useMemo(() => items.map(itemKey), [items]);

  useEffect(() => {
    setSelected(new Set());
  }, [reportDate]);

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

  const allSelected =
    allKeys.length > 0 && allKeys.every((key) => selected.has(key));

  const toggleOne = (key: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(allKeys));
  };

  const clearAll = () => {
    setSelected(new Set());
  };

  const handleDownload = async () => {
    if (!downloadsEnabled) {
      window.alert(SINGLE_DAY_DOWNLOADS_MESSAGE);
      return;
    }
    if (selected.size === 0) return;
    setDownloading(true);
    try {
      await downloadSelectedFiles(items, selected, reportDate);
    } finally {
      setDownloading(false);
    }
  };

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
        className="flex max-h-[min(28rem,75vh)] w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 p-2"
      >
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={allSelected || downloading}
            onClick={selectAll}
          >
            Select all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={selected.size === 0 || downloading}
            onClick={clearAll}
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            className="ml-auto h-7 gap-1 px-2 text-xs"
            disabled={selected.size === 0 || downloading}
            onClick={() => void handleDownload()}
          >
            {downloading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Downloading…
              </>
            ) : (
              <>Download{selected.size > 0 ? ` (${selected.size})` : ""}</>
            )}
          </Button>
        </div>
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
          {items.map((item) => {
            const key = itemKey(item);
            const checked = selected.has(key);
            return (
              <li key={key}>
                <label
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-brand-light/80",
                    downloading && "pointer-events-none opacity-60",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={downloading}
                    className="mt-0.5"
                    onCheckedChange={(value) =>
                      toggleOne(key, value === true)
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="break-words font-mono leading-snug text-slate-800">
                    {item.label}
                  </span>
                </label>
              </li>
            );
          })}
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
