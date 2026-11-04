"use client";

import { Button } from "@/components/ui/button";
import {
  CODE_ORDER,
  formatWarningLine,
  groupWarningsByCode,
  SECTION_INTRO,
} from "@/lib/upload-warnings-ui";
import type { RawCsvWarning } from "@/lib/raw-csv-validation";
import type { DownloadableAfterWarning } from "@/lib/upload/downloadable-after-warnings";
import { useEffect, useRef } from "react";

interface UploadWarningsDialogProps {
  warnings: RawCsvWarning[];
  downloadableAfterWarnings?: DownloadableAfterWarning[];
  uploadToken?: string;
  open: boolean;
  onDismiss: () => void;
}

function withToken(url: string, uploadToken?: string): string {
  if (!uploadToken?.trim()) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}uploadToken=${encodeURIComponent(uploadToken.trim())}`;
}

export function UploadWarningsDialog({
  warnings,
  downloadableAfterWarnings = [],
  uploadToken,
  open,
  onDismiss,
}: UploadWarningsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && warnings.length > 0) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open, warnings.length]);

  if (warnings.length === 0) return null;

  const grouped = groupWarningsByCode(warnings);
  const rawDownloads = downloadableAfterWarnings.filter((d) => d.kind === "raw");
  const masterDownloads = downloadableAfterWarnings.filter(
    (d) => d.kind === "master",
  );

  return (
    <dialog
      ref={dialogRef}
      className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-amber-200 bg-white p-0 shadow-xl backdrop:bg-black/40 open:flex open:flex-col"
      onClose={onDismiss}
    >
      <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-amber-950">
          Upload completed with warnings
        </h2>
        <p className="mt-1 text-xs text-amber-900/80">
          Data was processed successfully. Review the items below before relying
          on affected meters.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {CODE_ORDER.map((code) => {
          const items = grouped.get(code);
          if (!items?.length) return null;
          return (
            <section key={code}>
              <p className="text-xs leading-snug text-slate-700">
                {SECTION_INTRO[code]}
              </p>
              <ul className="mt-2 space-y-1 text-xs font-mono text-slate-800">
                {items.map((w, i) => (
                  <li key={`${w.file}-${w.column}-${i}`} className="break-all">
                    {formatWarningLine(w)}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {downloadableAfterWarnings.length > 0 && (
          <section className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-xs font-semibold text-slate-800">
              Download for manual review
            </h3>
            <p className="mt-1 text-[11px] text-slate-600">
              Copies from the host after this upload (staged raw CSVs and updated
              master workbooks tied to warnings).
            </p>
            {rawDownloads.length > 0 && (
              <ul className="mt-2 space-y-1">
                {rawDownloads.map((d) => (
                  <li key={d.id}>
                    <a
                      href={withToken(d.downloadUrl, uploadToken)}
                      className="text-xs font-medium text-brand underline underline-offset-2"
                      download
                    >
                      {d.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {masterDownloads.length > 0 && (
              <ul className="mt-2 space-y-1">
                {masterDownloads.map((d) => (
                  <li key={d.id}>
                    <a
                      href={withToken(d.downloadUrl, uploadToken)}
                      className="text-xs font-medium text-brand underline underline-offset-2"
                      download
                    >
                      {d.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
      <div className="border-t border-brand-border px-4 py-3">
        <Button type="button" size="sm" className="w-full" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </dialog>
  );
}
