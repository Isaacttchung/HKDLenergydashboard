"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Upload } from "lucide-react";
import { DuplicateDateDialog } from "@/components/dashboard/duplicate-date-dialog";
import { ModeCUploadWarningDialog } from "@/components/dashboard/mode-c-upload-warning-dialog";
import { OutOfOrderUploadDialog } from "@/components/dashboard/out-of-order-upload-dialog";
import type { ModeCOutdatedWarning } from "@/lib/upload/mode-c-upload-types";
import { HccpGasCapacityPreflightDialog } from "@/components/dashboard/hccp-gas-capacity-preflight-dialog";
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
import { UploadPasswordDialog } from "@/components/dashboard/upload-password-dialog";
import { ExcelEditorComingSoonDialog } from "@/components/dashboard/excel-editor-coming-soon-dialog";
import { ExcelEditorPickerDialog } from "@/components/dashboard/excel-editor-picker-dialog";
import { Top10MasterEditorDialog } from "@/components/dashboard/top-10-master-editor-dialog";
import type { ExcelEditorTarget } from "@/lib/master-editor/excel-editor-catalog";
import { EXCEL_EDITOR_WORKBOOKS } from "@/lib/master-editor/excel-editor-catalog";
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

type PasswordGatePurpose = "edit-excel" | "upload-files" | "upload-pick";

export function MasterSheetUpload({ onUploadSuccess }: MasterSheetUploadProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [requiresToken, setRequiresToken] = useState(false);
  const [expected, setExpected] = useState<ExpectedFileStatus[]>([]);
  const [uploadToken, setUploadToken] = useState("");
  const [editExcelToken, setEditExcelToken] = useState("");
  const uploadActionTokenRef = useRef<string | null>(null);
  const pendingPickAwaitingAuthRef = useRef<File[] | null>(null);
  const passwordPurposeRef = useRef<PasswordGatePurpose | null>(null);
  const fileInputAnchorRef = useRef<HTMLDivElement>(null);
  const passwordFilePickerHostRef = useRef<HTMLDivElement>(null);
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
  const [outOfOrderOpen, setOutOfOrderOpen] = useState(false);
  const [outOfOrderIncoming, setOutOfOrderIncoming] = useState<string | null>(
    null,
  );
  const [outOfOrderLatest, setOutOfOrderLatest] = useState<string | null>(null);
  const [outOfOrderMessage, setOutOfOrderMessage] = useState<string | null>(
    null,
  );
  const [confirmingOutOfOrder, setConfirmingOutOfOrder] = useState(false);
  const [gasPreflightOpen, setGasPreflightOpen] = useState(false);
  const [gasPreflightMessage, setGasPreflightMessage] = useState<string | null>(
    null,
  );
  const [gasPreflightMissingDates, setGasPreflightMissingDates] = useState<
    string[]
  >([]);
  const [confirmingGasPreflight, setConfirmingGasPreflight] = useState(false);
  const [modeCWarningOpen, setModeCWarningOpen] = useState(false);
  const [modeCWarningMessage, setModeCWarningMessage] = useState<string | null>(
    null,
  );
  const [modeCUnchangedLabels, setModeCUnchangedLabels] = useState<string[]>(
    [],
  );
  const [modeCOutdated, setModeCOutdated] = useState<ModeCOutdatedWarning[]>([]);
  const [confirmingModeCWarning, setConfirmingModeCWarning] = useState(false);
  const hccpGasSupplementRef = useRef<File[]>([]);
  const hccpGasSupplementInputRef = useRef<HTMLInputElement>(null);
  const [excelPickerOpen, setExcelPickerOpen] = useState(false);
  const [top10EditorOpen, setTop10EditorOpen] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [comingSoonSheet, setComingSoonSheet] = useState<{
    workbookId: ExcelEditorTarget["workbookId"];
    sheetLabel: string;
  } | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordPurpose, setPasswordPurpose] =
    useState<PasswordGatePurpose | null>(null);
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

  const clearUploadActionToken = useCallback(() => {
    uploadActionTokenRef.current = null;
    setUploadToken("");
  }, []);

  const clearEditExcelToken = useCallback(() => {
    setEditExcelToken("");
  }, []);

  const openPasswordGate = useCallback((purpose: PasswordGatePurpose) => {
    passwordPurposeRef.current = purpose;
    setPasswordPurpose(purpose);
    setPasswordDialogOpen(true);
  }, []);

  const triggerUploadFilePicker = useCallback(() => {
    if (passwordPurposeRef.current !== "upload-pick") return;
    const el = fileInputRef.current;
    if (!el || uploading) return;
    try {
      if (typeof el.showPicker === "function") {
        el.showPicker();
        return;
      }
    } catch {
      // fall through to click()
    }
    el.click();
  }, [uploading]);

  useEffect(() => {
    const input = fileInputRef.current;
    const dialogHost = passwordFilePickerHostRef.current;
    const anchor = fileInputAnchorRef.current;
    if (!input) return;
    const reparent =
      passwordDialogOpen && passwordPurpose === "upload-pick";
    const target = reparent && dialogHost ? dialogHost : anchor;
    if (target && input.parentElement !== target) {
      target.appendChild(input);
    }
  }, [passwordDialogOpen, passwordPurpose]);

  const uploadFiles = async (
    fileList: FileList | File[],
    options?: {
      replaceExisting?: boolean;
      confirmOutOfOrder?: boolean;
      confirmModeCSoftWarnings?: boolean;
      skipGasConversion?: boolean;
    },
    tokenOverride?: string,
  ) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const replaceExisting = options?.replaceExisting ?? false;
    const confirmOutOfOrder = options?.confirmOutOfOrder ?? false;
    const confirmModeCSoftWarnings = options?.confirmModeCSoftWarnings ?? false;
    const skipGasConversion = options?.skipGasConversion ?? false;
    if (replaceExisting) {
      setReplacingDuplicate(true);
    } else if (confirmOutOfOrder) {
      setConfirmingOutOfOrder(true);
    } else if (confirmModeCSoftWarnings) {
      setConfirmingModeCWarning(true);
    } else if (skipGasConversion) {
      setConfirmingGasPreflight(true);
    } else {
      setUploading(true);
    }
    setError(null);
    setMessage(null);

    const form = new FormData();
    for (const file of files) {
      form.append("files", file);
    }
    const token =
      tokenOverride?.trim() ??
      uploadActionTokenRef.current?.trim() ??
      uploadToken.trim();
    if (token) {
      uploadActionTokenRef.current = token;
      setUploadToken(token);
      form.append("uploadToken", token);
    }
    if (replaceExisting) {
      form.append("replaceExisting", "true");
    }
    if (confirmOutOfOrder) {
      form.append("confirmOutOfOrder", "true");
    }
    if (confirmModeCSoftWarnings) {
      form.append("confirmModeCSoftWarnings", "true");
    }
    for (const supplement of hccpGasSupplementRef.current) {
      form.append("hccpGasCapacitySupplement", supplement);
    }
    if (skipGasConversion) {
      form.append("skipGasConversion", "true");
    }

    try {
      const headers: HeadersInit = {};
      if (token) {
        headers["x-upload-token"] = token;
      }

      const res = await fetch("/api/master-sheets/upload", {
        method: "POST",
        headers,
        body: form,
      });
      const json = await res.json();

      if (res.status === 409 && json.outOfOrder) {
        pendingUploadRef.current = files;
        setOutOfOrderIncoming((json.incomingDate as string) ?? null);
        setOutOfOrderLatest((json.latestUploadDate as string) ?? null);
        setOutOfOrderMessage((json.message as string) ?? null);
        setOutOfOrderOpen(true);
        return;
      }

      if (res.status === 409 && json.gasCapacityPreflight) {
        pendingUploadRef.current = files;
        setGasPreflightMessage((json.message as string) ?? null);
        setGasPreflightMissingDates(
          (json.missingDates as string[] | undefined) ?? [],
        );
        setGasPreflightOpen(true);
        return;
      }

      if (res.status === 409 && json.modeCSoftWarning) {
        pendingUploadRef.current = files;
        setModeCWarningMessage((json.message as string | undefined) ?? null);
        setModeCUnchangedLabels(
          (json.unchangedFileLabels as string[] | undefined) ?? [],
        );
        setModeCOutdated((json.outdated as ModeCOutdatedWarning[] | undefined) ?? []);
        setModeCWarningOpen(true);
        return;
      }

      if (res.status === 409 && json.duplicateDate) {
        pendingUploadRef.current = files;
        setDuplicateDate(json.duplicateDate as string);
        setDuplicateDateMessage((json.message as string | undefined) ?? null);
        setDuplicateDateOpen(true);
        return;
      }

      if (!res.ok) {
        setDuplicateDateOpen(false);
        clearUploadActionToken();
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
      hccpGasSupplementRef.current = [];
      setDuplicateDateOpen(false);
      setDuplicateDate(null);
      setDuplicateDateMessage(null);
      setOutOfOrderOpen(false);
      setOutOfOrderIncoming(null);
      setOutOfOrderLatest(null);
      setOutOfOrderMessage(null);
      setGasPreflightOpen(false);
      setGasPreflightMessage(null);
      setGasPreflightMissingDates([]);
      setModeCWarningOpen(false);
      setModeCWarningMessage(null);
      setModeCUnchangedLabels([]);
      setModeCOutdated([]);

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
        } else {
          clearUploadActionToken();
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
      } else if (json.mode === "mobile_fuels") {
        onUploadSuccess?.({
          latestDate: null,
          earliestDate: null,
          skipServerRefresh: true,
        });
      }
    } catch {
      setError("Upload failed — check network and try again");
    } finally {
      setUploading(false);
      setReplacingDuplicate(false);
      setConfirmingOutOfOrder(false);
      setConfirmingGasPreflight(false);
      setConfirmingModeCWarning(false);
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
    clearUploadActionToken();
  };

  const handleOutOfOrderContinue = () => {
    const pending = pendingUploadRef.current;
    if (!pending?.length) {
      setOutOfOrderOpen(false);
      return;
    }
    void uploadFiles(pending, { confirmOutOfOrder: true });
  };

  const handleOutOfOrderCancel = () => {
    pendingUploadRef.current = null;
    setOutOfOrderOpen(false);
    setOutOfOrderIncoming(null);
    setOutOfOrderLatest(null);
    setOutOfOrderMessage(null);
    clearUploadActionToken();
  };

  const handleModeCWarningContinue = () => {
    const pending = pendingUploadRef.current;
    if (!pending?.length) {
      setModeCWarningOpen(false);
      return;
    }
    void uploadFiles(pending, { confirmModeCSoftWarnings: true });
  };

  const handleModeCWarningCancel = () => {
    pendingUploadRef.current = null;
    setModeCWarningOpen(false);
    setModeCWarningMessage(null);
    setModeCUnchangedLabels([]);
    setModeCOutdated([]);
    clearUploadActionToken();
  };

  const handleGasPreflightContinue = () => {
    const pending = pendingUploadRef.current;
    if (!pending?.length) {
      setGasPreflightOpen(false);
      return;
    }
    void uploadFiles(pending, { skipGasConversion: true });
  };

  const handleGasPreflightCancel = () => {
    pendingUploadRef.current = null;
    hccpGasSupplementRef.current = [];
    setGasPreflightOpen(false);
    setGasPreflightMessage(null);
    setGasPreflightMissingDates([]);
    clearUploadActionToken();
  };

  const handleGasPreflightAddFile = () => {
    hccpGasSupplementInputRef.current?.click();
  };

  const handleGasSupplementPicked = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const picked = e.target.files;
    if (!picked?.length) return;
    hccpGasSupplementRef.current = [
      ...hccpGasSupplementRef.current,
      ...Array.from(picked),
    ];
    e.target.value = "";
    const pending = pendingUploadRef.current;
    if (!pending?.length) return;
    setGasPreflightOpen(false);
    void uploadFiles(pending);
  };

  const handlePasswordSuccess = useCallback(
    (token: string) => {
      const trimmed = token.trim();
      const purpose = passwordPurposeRef.current ?? passwordPurpose;
      passwordPurposeRef.current = null;
      setPasswordPurpose(null);
      if (purpose === "edit-excel") {
        setEditExcelToken(trimmed);
        setExcelPickerOpen(true);
      } else if (purpose === "upload-files") {
        const pending = pendingUploadRef.current;
        pendingUploadRef.current = null;
        if (pending?.length) void uploadFiles(pending, undefined, trimmed);
      } else if (purpose === "upload-pick") {
        uploadActionTokenRef.current = trimmed;
        const pendingPick = pendingPickAwaitingAuthRef.current;
        pendingPickAwaitingAuthRef.current = null;
        if (pendingPick?.length) {
          void uploadFiles(pendingPick, undefined, trimmed);
          setPasswordDialogOpen(false);
        }
      }
    },
    [passwordPurpose],
  );

  const passwordDialogDescription =
    passwordPurpose === "edit-excel"
      ? "Enter the host upload password before choosing a workbook to edit."
      : "Enter the host upload password before files are sent to the dropbox.";

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

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          if (requiresToken) {
            openPasswordGate("edit-excel");
            return;
          }
          setExcelPickerOpen(true);
        }}
      >
        Edit Excels
      </Button>

      <div ref={fileInputAnchorRef} className="sr-only" aria-hidden>
        <input
          ref={hccpGasSupplementInputRef}
          type="file"
          accept=".csv,text/csv"
          tabIndex={-1}
          disabled={uploading || confirmingGasPreflight}
          onChange={handleGasSupplementPicked}
        />
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          multiple
          tabIndex={-1}
          disabled={uploading}
          onChange={(e) => {
            const picked = e.target.files;
            if (!picked?.length) return;
            const files = Array.from(picked);
            const actionToken = uploadActionTokenRef.current;
            if (requiresToken && !actionToken) {
              pendingPickAwaitingAuthRef.current = files;
            } else {
              void uploadFiles(picked, undefined, actionToken ?? undefined);
              uploadActionTokenRef.current = null;
              if (passwordDialogOpen) {
                setPasswordDialogOpen(false);
                passwordPurposeRef.current = null;
                setPasswordPurpose(null);
              }
            }
            e.target.value = "";
          }}
        />
      </div>
      <label
        htmlFor={requiresToken ? undefined : inputId}
        onClick={(e) => {
          if (uploading) return;
          if (requiresToken) {
            e.preventDefault();
            openPasswordGate("upload-pick");
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (uploading) return;
          const dropped = e.dataTransfer.files;
          if (dropped.length === 0) return;
          if (requiresToken) {
            pendingUploadRef.current = Array.from(dropped);
            openPasswordGate("upload-files");
            return;
          }
          void uploadFiles(dropped);
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
          Option A ({RAW_CONVERSION_TOTAL_FILES} raw files), Option B (4 master
          excels), or Option C (mobile gasoline/diesel workbook)
        </span>
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

        <details className="rounded-md border border-brand-border bg-white/80 px-3 py-2.5 text-sm text-slate-600">
          <summary className="cursor-pointer select-none text-sm font-medium text-slate-700">
            Option C: Mobile fuels &amp; utilities — 1 or 2 workbooks
          </summary>
          <p className="mt-2 text-xs leading-snug text-slate-500">
            Upload one or both workbooks (no EMS CSVs or master sheets in the same
            batch). No Edit Excel for these files.
          </p>
          <ul className={cn("mt-3", uploadFileListClass)}>
            <li className={uploadFileNameClass}>
              …_Mobile_Gasoline_Diesel_data_sent.xlsx
            </li>
            <li className={uploadFileNameClass}>
              …Monthly Utilities Consumption….xlsx
            </li>
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

      <ExcelEditorPickerDialog
        open={excelPickerOpen}
        onClose={() => {
          setExcelPickerOpen(false);
          clearEditExcelToken();
        }}
        onConfirm={(target) => {
          setExcelPickerOpen(false);
          if (target.editor === "top10_webss") {
            setTop10EditorOpen(true);
            return;
          }
          const workbook = EXCEL_EDITOR_WORKBOOKS.find(
            (w) => w.id === target.workbookId,
          );
          const sheet = workbook?.sheets.find((s) => s.id === target.sheetId);
          setComingSoonSheet({
            workbookId: target.workbookId,
            sheetLabel: sheet?.label ?? target.sheetId,
          });
          setComingSoonOpen(true);
        }}
      />

      <Top10MasterEditorDialog
        open={top10EditorOpen}
        uploadToken={editExcelToken}
        onClose={() => {
          setTop10EditorOpen(false);
          setExcelPickerOpen(false);
          clearEditExcelToken();
        }}
        onBackToPicker={() => {
          setTop10EditorOpen(false);
          setExcelPickerOpen(true);
        }}
      />

      <ExcelEditorComingSoonDialog
        open={comingSoonOpen}
        workbookId={comingSoonSheet?.workbookId ?? null}
        sheetLabel={comingSoonSheet?.sheetLabel ?? null}
        onClose={() => {
          setComingSoonOpen(false);
          setComingSoonSheet(null);
          clearEditExcelToken();
        }}
      />

      <OutOfOrderUploadDialog
        incomingDate={outOfOrderIncoming}
        latestUploadDate={outOfOrderLatest}
        message={outOfOrderMessage}
        open={outOfOrderOpen}
        confirming={confirmingOutOfOrder}
        onContinue={handleOutOfOrderContinue}
        onCancel={handleOutOfOrderCancel}
      />

      <ModeCUploadWarningDialog
        message={modeCWarningMessage}
        unchangedFileLabels={modeCUnchangedLabels}
        outdated={modeCOutdated}
        open={modeCWarningOpen}
        confirming={confirmingModeCWarning}
        onContinue={handleModeCWarningContinue}
        onCancel={handleModeCWarningCancel}
      />

      <HccpGasCapacityPreflightDialog
        message={gasPreflightMessage}
        missingDates={gasPreflightMissingDates}
        open={gasPreflightOpen}
        busy={confirmingGasPreflight || uploading}
        onCancel={handleGasPreflightCancel}
        onAddCapacityFile={handleGasPreflightAddFile}
        onContinueAnyway={handleGasPreflightContinue}
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
          } else {
            clearUploadActionToken();
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
          clearUploadActionToken();
        }}
      />

      <UploadPasswordDialog
        open={passwordDialogOpen}
        description={passwordDialogDescription}
        filePickerHostRef={passwordFilePickerHostRef}
        closeOnSuccess={passwordPurpose !== "upload-pick"}
        onClose={() => {
          setPasswordDialogOpen(false);
          setPasswordPurpose((purpose) => {
            if (purpose === "upload-files") {
              pendingUploadRef.current = null;
            }
            if (purpose === "upload-pick") {
              uploadActionTokenRef.current = null;
              pendingPickAwaitingAuthRef.current = null;
            }
            passwordPurposeRef.current = null;
            return null;
          });
        }}
        onSuccess={handlePasswordSuccess}
        onContinueUserGesture={
          passwordPurpose === "upload-pick" ? triggerUploadFilePicker : undefined
        }
        onVerificationFailed={() => {
          if (passwordPurposeRef.current === "upload-pick") {
            pendingPickAwaitingAuthRef.current = null;
          }
        }}
      />
    </div>
  );
}
