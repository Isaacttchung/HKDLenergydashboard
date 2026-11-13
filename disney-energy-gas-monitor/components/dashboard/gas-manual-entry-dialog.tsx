"use client";

import { Button } from "@/components/ui/button";
import { computeHccpOverallOccupancy } from "@/lib/raw-to-master/hccp-gas-manual";
import {
  persistMasterSheetUploadToken,
  readMasterSheetUploadToken,
} from "@/lib/upload/upload-token-session";
import { Loader2 } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface GasManualEntryRequest {
  consumptionDate: string;
}

interface GasManualEntryDialogProps {
  request: GasManualEntryRequest | null;
  uploadToken: string;
  /** Host has `MASTER_SHEET_UPLOAD_TOKEN` — show password field when the upload token was not kept. */
  requiresUploadPassword?: boolean;
  open: boolean;
  onCompleted: (message: string) => void;
  onDismiss: () => void;
}

const FIELDS = [
  { key: "ballroomUtilization", label: "Ballroom utilization" },
  { key: "dlhOccupancy", label: "DLH Occupancy" },
  { key: "delOccupancy", label: "DEL Occupancy" },
  { key: "dhhOccupancy", label: "DHH Occupancy" },
  { key: "atten", label: "Atten" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export function GasManualEntryDialog({
  request,
  uploadToken,
  requiresUploadPassword = false,
  open,
  onCompleted,
  onDismiss,
}: GasManualEntryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formId = useId();
  const [values, setValues] = useState<Record<FieldKey, string>>({
    ballroomUtilization: "",
    dlhOccupancy: "",
    delOccupancy: "",
    dhhOccupancy: "",
    atten: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadPassword, setUploadPassword] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && request) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open, request]);

  useEffect(() => {
    if (open && request) {
      setValues({
        ballroomUtilization: "",
        dlhOccupancy: "",
        delOccupancy: "",
        dhhOccupancy: "",
        atten: "",
      });
      setError(null);
      setUploadPassword("");
      setShowPasswordField(false);
    }
  }, [open, request?.consumptionDate]);

  useEffect(() => {
    if (!open || !requiresUploadPassword) return;
    const existing = (uploadToken || readMasterSheetUploadToken()).trim();
    setShowPasswordField(!existing);
  }, [open, requiresUploadPassword, uploadToken]);

  const previewOverall = useMemo(() => {
    const dlh = Number(values.dlhOccupancy);
    const del = Number(values.delOccupancy);
    const dhh = Number(values.dhhOccupancy);
    if (![dlh, del, dhh].every(Number.isFinite)) return null;
    return computeHccpOverallOccupancy(dlh, del, dhh);
  }, [values.dlhOccupancy, values.delOccupancy, values.dhhOccupancy]);

  if (!request) return null;

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    const fields: Record<string, number> = {};
    for (const { key } of FIELDS) {
      const value = Number(values[key].trim());
      if (!Number.isFinite(value)) {
        setError(`Enter a valid number for ${FIELDS.find((f) => f.key === key)?.label}.`);
        setSaving(false);
        return;
      }
      fields[key] = value;
    }

    try {
      const token = (
        uploadToken ||
        readMasterSheetUploadToken() ||
        uploadPassword
      ).trim();
      if (requiresUploadPassword && !token) {
        setShowPasswordField(true);
        setError("Enter the host upload password to save manual gas fields.");
        setSaving(false);
        return;
      }
      if (token) {
        persistMasterSheetUploadToken(token);
      }
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["x-upload-token"] = token;
      }
      const res = await fetch("/api/master-sheets/gas-manual-fields", {
        method: "POST",
        headers,
        body: JSON.stringify({
          consumptionDate: request.consumptionDate,
          fields,
          ...(token ? { uploadToken: token } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setShowPasswordField(true);
          setError(
            "Invalid upload password — enter the same password you used for the dropbox upload.",
          );
        } else {
          setError(json.error ?? "Could not save gas manual fields");
        }
        return;
      }
      onCompleted(
        (json.message as string) ??
          `Gas sheet updated for ${request.consumptionDate}.`,
      );
      onDismiss();
    } catch {
      setError("Network error — try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="fixed left-1/2 top-1/2 z-[70] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-300 bg-white p-0 shadow-xl backdrop:bg-black/40 open:block"
      onCancel={(e) => {
        e.preventDefault();
        onDismiss();
      }}
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Gas Meter Reading — manual fields
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          Report date{" "}
          <span className="font-medium">{request.consumptionDate}</span> (EMS
          batch data day from raw CSV Timestamps). Meter I/J/K, gas outdoor temp (H),
          and Park Y are already set. Saving updates gas ballroom/occupancy/Atten
          and syncs Hotel O + Park Z on the same report date.
        </p>
      </div>
      <form
        id={formId}
        className="max-h-[70vh] space-y-3 overflow-y-auto px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        {FIELDS.map(({ key, label }) => (
          <FieldGroup key={key} label={label} id={`${formId}-${key}`}>
            <input
              id={`${formId}-${key}`}
              type="number"
              inputMode="decimal"
              step="any"
              required
              disabled={saving}
              value={values[key]}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [key]: e.target.value }))
              }
              className="w-full rounded-md border border-brand-border px-2 py-1.5 text-sm"
            />
          </FieldGroup>
        ))}
        <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <span className="font-medium">Overall Occupancy (column G)</span> is
          calculated:{" "}
          <code className="text-[10px]">
            ((DLH×400)+(DEL×750)+(DHH×600))/1750
          </code>
          {previewOverall !== null && (
            <span className="ml-2 font-semibold tabular-nums">
              → {previewOverall.toFixed(4)}
            </span>
          )}
        </div>
        {showPasswordField && (
          <FieldGroup
            label="Upload password"
            id={`${formId}-upload-password`}
          >
            <input
              id={`${formId}-upload-password`}
              type="password"
              autoComplete="current-password"
              disabled={saving}
              value={uploadPassword}
              onChange={(e) => setUploadPassword(e.target.value)}
              placeholder="Same as Excel/Raw Data Dropbox"
              className="w-full rounded-md border border-brand-border px-2 py-1.5 text-sm"
            />
          </FieldGroup>
        )}
        {error && (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </form>
      <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={saving}
          onClick={onDismiss}
        >
          Skip for now
        </Button>
        <Button
          type="submit"
          form={formId}
          size="sm"
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            "Save to gas master"
          )}
        </Button>
      </div>
    </dialog>
  );
}

function FieldGroup({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
