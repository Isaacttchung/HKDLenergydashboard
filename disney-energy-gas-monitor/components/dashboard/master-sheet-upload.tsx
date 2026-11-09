"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Upload } from "lucide-react";
import { DuplicateDateDialog } from "@/components/dashboard/duplicate-date-dialog";
import { GasManualEntryDialog } from "@/components/dashboard/gas-manual-entry-dialog";
import { UploadWarningsDialog } from "@/components/dashboard/upload-warnings-dialog";
import type { GasManualEntryRequest } from "@/components/dashboard/gas-manual-entry-dialog";
import type { MasterSheetUploadMeta } from "@/lib/master-sheet-upload-meta";
import type { RawCsvWarning } from "@/lib/raw-csv-validation";
import type { DownloadableAfterWarning } from "@/lib/upload/downloadable-after-warnings";
import { EXPECTED_RAW_LOGICAL_IDS } from "@/lib/expected-raw-logical-ids";
import { EXPECTED_MASTER_SHEET_FILES } from "@/lib/expected-master-sheet-files";
import {
  RAW_CONVERSION_FEED_IN_MASTER,
  RAW_CONVERSION_HCCP_GAS_CAPACITY_CSV,
  RAW_CONVERSION_TOTAL_FILES,
} from "@/lib/upload/batch-classifier";
import { UPLOAD_TOKEN_STORAGE_KEY } from "@/components/dashboard/report-document-downloads";
import { useCallback, useEffect, useId, useRef, useState } from "react";

interface ExpectedFileStatus {
  name: string;
  present: boolean;
  modifiedAt?: string;
  sizeBytes?: number;
}

interface HostDataStatus {
  latestReportDate: string | null;
  masterSheetsDirectory: string | null;
  workingDirectory: string | null;
  extraSpreadsheetFiles: string[];
}

interface MasterSheetUploadProps {
  onUploadSuccess?: (meta: MasterSheetUploadMeta) => void;
}

const uploadFileListClass =
  "list-disc space-y-1.5 pl-5 [list-style-position:outside] marker:text-slate-400";

const uploadFileNameClass =
  "font-mono text-[13px] leading-snug text-slate-800 break-words";

export function MasterSheetUpload({ onUploadSuccess }: MasterSheetUploadProps) {
  const inputId = useId();
  const [requiresToken, setRequiresToken] = useState(false);
  const [expected, setExpected] = useState<ExpectedFileStatus[]>([]);
  const [uploadToken, setUploadToken] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hostStatus, setHostStatus] = useState<HostDataStatus | null>(null);
  const [postUploadWarnings, setPostUploadWarnings] = useState<RawCsvWarning[]>(
    [],
  );
  const [warningsDialogOpen, setWarningsDialogOpen] = useState(false);
  const [downloadableAfterWarnings, setDownloadableAfterWarnings] = useState<
    DownloadableAfterWarning[]
  >([]);
  const pendingUploadRef = useRef<File[] | null>(null);
  const [duplicateDateOpen, setDuplicateDateOpen] = useState(false);
  const [duplicateDate, setDuplicateDate] = useState<string | null>(null);
  const [duplicateDateMessage, setDuplicateDateMessage] = useState<string | null>(
    null,
  );
  const [replacingDuplicate, setReplacingDuplicate] = useState(false);
  const [gasManualEntry, setGasManualEntry] =
    useState<GasManualEntryRequest | null>(null);
  const [gasManualDialogOpen, setGasManualDialogOpen] = useState(false);
  const pendingGasManualRef = useRef<GasManualEntryRequest | null>(null);

  const loadStatus = useCallback(() => {
    fetch("/api/master-sheets/upload")
      .then((res) => res.json())
      .then((json) => {
        setRequiresToken(Boolean(json.requiresToken));
        setExpected(json.expected ?? []);
        setHostStatus({
          latestReportDate: json.latestReportDate ?? null,
          masterSheetsDirectory: json.masterSheetsDirectory ?? null,
          workingDirectory: json.workingDirectory ?? null,
          extraSpreadsheetFiles: json.extraSpreadsheetFiles ?? [],
        });
      })
      .catch(() => setError("Could not load upload settings"));
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (uploadToken.trim()) {
      sessionStorage.setItem(UPLOAD_TOKEN_STORAGE_KEY, uploadToken.trim());
    }
  }, [uploadToken]);

  const uploadFiles = async (
    fileList: FileList | File[],
    options?: { replaceExisting?: boolean },
  ) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const replaceExisting = options?.replaceExisting ?? false;
    if (replaceExisting) {
      setReplacingDuplicate(true);
    } else {
      setUploading(true);
    }
    setError(null);
    setMessage(null);

    const form = new FormData();
    for (const file of files) {
      form.append("files", file);
    }
    if (uploadToken.trim()) {
      form.append("uploadToken", uploadToken.trim());
    }
    if (replaceExisting) {
      form.append("replaceExisting", "true");
    }

    try {
      const headers: HeadersInit = {};
      if (uploadToken.trim()) {
        headers["x-upload-token"] = uploadToken.trim();
      }

      const res = await fetch("/api/master-sheets/upload", {
        method: "POST",
        headers,
        body: form,
      });
      const json = await res.json();

      if (res.status === 409 && json.duplicateDate) {
        pendingUploadRef.current = files;
        setDuplicateDate(json.duplicateDate as string);
        setDuplicateDateMessage((json.message as string | undefined) ?? null);
        setDuplicateDateOpen(true);
        return;
      }

      if (!res.ok) {
        setDuplicateDateOpen(false);
        setError(json.error ?? "Upload failed");
        if (json.missing?.length) {
          setError(
            `${json.error ?? "Upload failed"} — missing: ${(json.missing as string[]).join(", ")}`,
          );
        } else if (json.skipped?.length) {
          setError(
            `${json.error ?? "Upload failed"} (${json.skipped.map((s: { name: string; reason: string }) => s.reason).join(", ")})`,
          );
        }
        return;
      }

      pendingUploadRef.current = null;
      setDuplicateDateOpen(false);
      setDuplicateDate(null);
      setDuplicateDateMessage(null);

      const saved = (json.saved as string[]).join(", ");
      setMessage(
        (json.message as string | undefined) ??
          `Saved: ${saved}. Refreshing dashboard…`,
      );

      const warnings = (json.warnings as RawCsvWarning[] | undefined) ?? [];
      const downloads =
        (json.downloadableAfterWarnings as
          | DownloadableAfterWarning[]
          | undefined) ?? [];
      const gasEntry =
        json.mode === "raw" && json.gasManualEntry
          ? (json.gasManualEntry as GasManualEntryRequest)
          : null;
      pendingGasManualRef.current = gasEntry;
      if (warnings.length > 0) {
        setPostUploadWarnings(warnings);
        setDownloadableAfterWarnings(downloads);
        setWarningsDialogOpen(true);
      } else {
        setPostUploadWarnings([]);
        setDownloadableAfterWarnings([]);
        setWarningsDialogOpen(false);
        if (gasEntry) {
          setGasManualEntry(gasEntry);
          setGasManualDialogOpen(true);
        }
      }

      loadStatus();
      if (json.mode === "master" || json.mode === "raw") {
        if (json.mode === "master") {
          setHostStatus({
            latestReportDate:
              (json.latestDate as string | null | undefined) ?? null,
            masterSheetsDirectory:
              (json.masterSheetsDirectory as string | undefined) ?? null,
            workingDirectory:
              (json.workingDirectory as string | undefined) ?? null,
            extraSpreadsheetFiles:
              (json.extraSpreadsheetFiles as string[] | undefined) ?? [],
          });
        }
        onUploadSuccess?.({
          latestDate: (json.latestDate as string | null | undefined) ?? null,
          earliestDate: (json.earliestDate as string | null | undefined) ?? null,
        });
      }
    } catch {
      setError("Upload failed — check network and try again");
    } finally {
      setUploading(false);
      setReplacingDuplicate(false);
    }
  };

  const handleDuplicateReplace = () => {
    const pending = pendingUploadRef.current;
    if (!pending?.length) {
      setDuplicateDateOpen(false);
      return;
    }
    void uploadFiles(pending, { replaceExisting: true });
  };

  const handleDuplicateCancel = () => {
    pendingUploadRef.current = null;
    setDuplicateDateOpen(false);
    setDuplicateDate(null);
    setDuplicateDateMessage(null);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-brand-foreground">
          Excel/Raw Data Dropbox
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Drop updated Excel files here. They replace files in{" "}
          <code className="text-[11px]">data/master-sheets</code> on the PC
          running this app.
        </p>
      </div>

      {requiresToken && (
        <div className="space-y-1">
          <label
            htmlFor={`${inputId}-token`}
            className="text-xs font-medium text-slate-600"
          >
            Upload password
          </label>
          <input
            id={`${inputId}-token`}
            type="password"
            autoComplete="off"
            value={uploadToken}
            onChange={(e) => setUploadToken(e.target.value)}
            className="w-full rounded-md border border-brand-border px-2 py-1.5 text-sm"
            placeholder="From host .env.local (test default: 12345)"
          />
        </div>
      )}

      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!uploading) void uploadFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-10 text-center transition-colors",
          dragOver
            ? "border-brand bg-brand-light/80"
            : "border-brand-border bg-brand-light/30 hover:bg-brand-light/60",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        <Upload className="h-6 w-6 text-brand-muted" />
        <span className="text-xs font-medium text-slate-700">
          Option A ({RAW_CONVERSION_TOTAL_FILES} rawdata files) or Option B (4
          master excels)
        </span>
        <input
          id={inputId}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          multiple
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files) void uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      <div className="space-y-2">
        <details className="rounded-md border border-brand-border bg-white/80 px-3 py-2.5 text-sm text-slate-600">
          <summary className="cursor-pointer select-none text-sm font-medium text-slate-700">
            Option A: Raw conversion — {RAW_CONVERSION_TOTAL_FILES} files
          </summary>
          <p className="mt-2 text-xs leading-snug text-slate-500">
            Drop these together. All IVU CSVs must share the same{" "}
            <code className="text-xs">Timestamp</code> day.
          </p>
          <p className="mt-3 text-sm font-medium text-slate-700">26 IVU CSVs</p>
          <div className="mt-2 grid grid-cols-1 gap-x-8 gap-y-0 md:grid-cols-2">
            {[
              EXPECTED_RAW_LOGICAL_IDS.slice(0, 13),
              EXPECTED_RAW_LOGICAL_IDS.slice(13),
            ].map((column, colIndex) => (
              <ul key={colIndex} className={cn(uploadFileListClass, "min-w-0")}>
                {column.map((id) => (
                  <li key={id} className={uploadFileNameClass}>
                    {id}.csv
                  </li>
                ))}
              </ul>
            ))}
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700">Plus</p>
          <ul className={cn("mt-2", uploadFileListClass)}>
            <li className={uploadFileNameClass}>
              {RAW_CONVERSION_HCCP_GAS_CAPACITY_CSV}
            </li>
            <li className={uploadFileNameClass}>
              {RAW_CONVERSION_FEED_IN_MASTER}
            </li>
          </ul>
        </details>

        <details className="rounded-md border border-brand-border bg-white/80 px-3 py-2.5 text-sm text-slate-600">
          <summary className="cursor-pointer select-none text-sm font-medium text-slate-700">
            Option B: Master workbooks — {EXPECTED_MASTER_SHEET_FILES.length}{" "}
            files
          </summary>
          <p className="mt-2 text-xs leading-snug text-slate-500">
            Drop all four updated Excel masters together. They replace the files
            in <code className="text-xs">data/master-sheets</code>.
          </p>
          <ul className={cn("mt-3", uploadFileListClass)}>
            {EXPECTED_MASTER_SHEET_FILES.map((name) => (
              <li key={name} className={uploadFileNameClass}>
                {name}
              </li>
            ))}
          </ul>
        </details>
      </div>

      {hostStatus?.latestReportDate && (
        <p className="text-xs text-slate-700">
          Host latest report date:{" "}
          <span className="font-medium">{hostStatus.latestReportDate}</span>
        </p>
      )}

      {expected.length > 0 && (
        <ul className="space-y-0.5 text-sm text-slate-600">
          {expected.map((file) => (
            <li key={file.name} className="py-0.5">
              <div className="flex gap-2 leading-snug">
                <span
                  className={cn(
                    "shrink-0",
                    file.present ? "text-green-600" : "text-amber-600",
                  )}
                  aria-hidden
                >
                  {file.present ? "●" : "○"}
                </span>
                <span className={cn(uploadFileNameClass, "font-sans text-xs")}>
                  {file.name}
                </span>
              </div>
              {file.present && file.modifiedAt && (
                <p className="pl-4 text-[11px] leading-tight text-slate-500">
                  {new Date(file.modifiedAt).toLocaleString()}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {hostStatus?.extraSpreadsheetFiles &&
        hostStatus.extraSpreadsheetFiles.length > 0 && (
          <p className="text-[11px] leading-snug text-amber-800">
            Extra Excel files in the host folder (not used by the dashboard):{" "}
            {hostStatus.extraSpreadsheetFiles.join(", ")}. Remove or rename them
            on the host PC so only the four standard filenames remain.
          </p>
        )}

      {uploading && (
        <p className="flex items-center gap-2 text-xs text-slate-600">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Uploading…
        </p>
      )}
      {message && (
        <p className="text-xs text-green-700" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      {!requiresToken && (
        <p className="text-[11px] leading-snug text-amber-800">
          No upload password is set. Anyone with the ngrok link can replace master
          sheets. On the host PC, set{" "}
          <code className="text-[10px]">MASTER_SHEET_UPLOAD_TOKEN</code> in the
          environment before starting the app.
        </p>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-full text-xs"
        onClick={() => loadStatus()}
        disabled={uploading}
      >
        Refresh file list
      </Button>

      <DuplicateDateDialog
        duplicateDate={duplicateDate}
        message={duplicateDateMessage}
        open={duplicateDateOpen}
        replacing={replacingDuplicate}
        onReplace={handleDuplicateReplace}
        onCancel={handleDuplicateCancel}
      />

      <UploadWarningsDialog
        warnings={postUploadWarnings}
        downloadableAfterWarnings={downloadableAfterWarnings}
        uploadToken={uploadToken}
        open={warningsDialogOpen}
        onDismiss={() => {
          setWarningsDialogOpen(false);
          const pending = pendingGasManualRef.current;
          if (pending) {
            setGasManualEntry(pending);
            setGasManualDialogOpen(true);
            pendingGasManualRef.current = null;
          }
        }}
      />

      <GasManualEntryDialog
        request={gasManualEntry}
        uploadToken={uploadToken}
        open={gasManualDialogOpen}
        onCompleted={(msg) => {
          setMessage(msg);
          loadStatus();
          onUploadSuccess?.({
            latestDate: hostStatus?.latestReportDate ?? null,
            earliestDate: null,
          });
        }}
        onDismiss={() => {
          setGasManualDialogOpen(false);
          setGasManualEntry(null);
        }}
      />
    </div>
  );
}
