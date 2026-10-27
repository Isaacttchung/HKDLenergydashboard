"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Upload } from "lucide-react";
import type { MasterSheetUploadMeta } from "@/lib/master-sheet-upload-meta";
import { useCallback, useEffect, useId, useState } from "react";

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

  const uploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    setMessage(null);

    const form = new FormData();
    for (const file of files) {
      form.append("files", file);
    }
    if (uploadToken.trim()) {
      form.append("uploadToken", uploadToken.trim());
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

      if (!res.ok) {
        setError(json.error ?? "Upload failed");
        if (json.skipped?.length) {
          setError(
            `${json.error ?? "Upload failed"} (${json.skipped.map((s: { name: string; reason: string }) => s.reason).join(", ")})`,
          );
        }
        return;
      }

      const saved = (json.saved as string[]).join(", ");
      setMessage(
        (json.message as string | undefined) ??
          `Saved: ${saved}. Refreshing dashboard…`,
      );
      loadStatus();
      setHostStatus({
        latestReportDate: (json.latestDate as string | null | undefined) ?? null,
        masterSheetsDirectory:
          (json.masterSheetsDirectory as string | undefined) ?? null,
        workingDirectory: (json.workingDirectory as string | undefined) ?? null,
        extraSpreadsheetFiles:
          (json.extraSpreadsheetFiles as string[] | undefined) ?? [],
      });
      onUploadSuccess?.({
        latestDate: (json.latestDate as string | null | undefined) ?? null,
        earliestDate: (json.earliestDate as string | null | undefined) ?? null,
      });
    } catch {
      setError("Upload failed — check network and try again");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-brand-foreground">
          Master sheet dropbox
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Drop updated Excel files here. They replace files in{" "}
          <code className="text-[11px]">data/master-sheets</code> on the PC
          running this app (your ngrok host). Spaces in filenames are fine — they
          are saved under the standard underscore names the dashboard expects.
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
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-6 text-center transition-colors",
          dragOver
            ? "border-brand bg-brand-light/80"
            : "border-brand-border bg-brand-light/30 hover:bg-brand-light/60",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        <Upload className="h-6 w-6 text-brand-muted" />
        <span className="text-xs font-medium text-slate-700">
          Drop .xlsx files or click to browse
        </span>
        <input
          id={inputId}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          multiple
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files) void uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {hostStatus?.latestReportDate && (
        <p className="text-xs text-slate-700">
          Host latest EMS date:{" "}
          <span className="font-medium">{hostStatus.latestReportDate}</span>
          <span className="text-slate-500">
            {" "}
            (from files on the PC running this app — refresh the page to confirm
            it matches)
          </span>
        </p>
      )}

      {expected.length > 0 && (
        <ul className="space-y-1 text-xs text-slate-600">
          {expected.map((file) => (
            <li key={file.name} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <span className="flex gap-2">
                <span
                  className={file.present ? "text-green-600" : "text-amber-600"}
                  aria-hidden
                >
                  {file.present ? "●" : "○"}
                </span>
                <span className="break-all">{file.name}</span>
              </span>
              {file.present && file.modifiedAt && (
                <span className="text-[10px] text-slate-500 sm:ml-auto sm:shrink-0">
                  {new Date(file.modifiedAt).toLocaleString()}
                </span>
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

      {hostStatus?.masterSheetsDirectory && (
        <p className="text-[10px] leading-snug text-slate-500 break-all">
          Host folder: {hostStatus.masterSheetsDirectory}
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
    </div>
  );
}
