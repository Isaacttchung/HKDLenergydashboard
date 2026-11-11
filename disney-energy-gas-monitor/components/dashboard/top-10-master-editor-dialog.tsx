"use client";

import { ModalOverlay } from "@/components/dashboard/modal-overlay";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StableSelect } from "@/components/ui/stable-select";
import { Top10SumCcp1RemoveDialog } from "@/components/dashboard/top-10-sum-ccp1-remove-dialog";
import { rawLogicalIdDisplayFilename } from "@/lib/raw-data-config";
import { rowFeedsSumCcp1Aggregate } from "@/lib/raw-to-master/top-10-sum-ccp1";
import { Loader2 } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

type InsertKind = "plain" | "solar";

const INSERT_KIND_OPTIONS: { value: InsertKind; label: string }[] = [
  { value: "plain", label: "No Solar" },
  { value: "solar", label: "Solar" },
];

type EditorMode = "rename" | "insert" | "remove";

const EDITOR_MODE_LABELS: Record<EditorMode, string> = {
  rename: "Rename Meters/Locations",
  insert: "Insert New Meters/Locations",
  remove: "Remove Meters/Locations",
};

interface Top10EditorRow {
  sheetRow: number;
  meter: string;
  location: string;
  mapped: boolean;
  rawDataRow?: number;
  kind?: string;
}

interface LinkOption {
  linkId: number;
  logicalId: string;
}

interface Top10MasterEditorDialogProps {
  open: boolean;
  uploadToken: string;
  onClose: () => void;
  onBackToPicker: () => void;
}

export function Top10MasterEditorDialog({
  open,
  uploadToken,
  onClose,
  onBackToPicker,
}: Top10MasterEditorDialogProps) {
  const [rows, setRows] = useState<Top10EditorRow[]>([]);
  const [linkOptions, setLinkOptions] = useState<LinkOption[]>([]);
  const [mappingSource, setMappingSource] = useState<"override" | "bundled">(
    "bundled",
  );
  const [mode, setMode] = useState<EditorMode>("rename");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Top10EditorRow | null>(null);
  const [meter, setMeter] = useState("");
  const [location, setLocation] = useState("");
  const [kind, setKind] = useState<InsertKind>("plain");
  const [importLink, setImportLink] = useState("");
  const [importCol, setImportCol] = useState("");
  const [recCol, setRecCol] = useState("");
  const [feedInCols, setFeedInCols] = useState("");
  const [applying, setApplying] = useState(false);
  const [sumCcp1RemoveOpen, setSumCcp1RemoveOpen] = useState(false);

  const authHeaders = useMemo((): HeadersInit => {
    const h: HeadersInit = {};
    if (uploadToken.trim()) h["x-upload-token"] = uploadToken.trim();
    return h;
  }, [uploadToken]);

  const loadSchema = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/master-sheets/top-10/editor", {
        headers: authHeaders,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not load Top 10 schema");
        return;
      }
      setRows(json.rows ?? []);
      setLinkOptions(json.linkOptions ?? []);
      setMappingSource(json.mappingSource ?? "bundled");
    } catch {
      setError("Network error loading schema");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const resetEditor = useCallback(() => {
    setMode("rename");
    setSelected(null);
    setFilter("");
    setError(null);
    setMessage(null);
    setMeter("");
    setLocation("");
    setKind("plain");
    setImportLink("");
    setImportCol("");
    setRecCol("");
    setFeedInCols("");
    void loadSchema();
  }, [loadSchema]);

  useEffect(() => {
    if (open) {
      resetEditor();
    }
  }, [open, resetEditor]);

  useEffect(() => {
    if (!selected) return;
    if (mode === "rename") {
      setMeter(selected.meter);
      setLocation(selected.location);
    } else if (mode === "insert") {
      setMeter("");
      setLocation("");
    }
  }, [selected, mode]);

  const importFileOptions = useMemo(
    () =>
      [...linkOptions]
        .sort((a, b) => a.logicalId.localeCompare(b.logicalId))
        .map((o) => ({
          value: String(o.linkId),
          label: rawLogicalIdDisplayFilename(o.logicalId),
        })),
    [linkOptions],
  );

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.meter.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q),
    );
  }, [rows, filter]);

  const requestPrimaryAction = () => {
    if (
      mode === "remove" &&
      selected &&
      rowFeedsSumCcp1Aggregate(selected.rawDataRow)
    ) {
      setSumCcp1RemoveOpen(true);
      return;
    }
    void postAction();
  };

  const postAction = async () => {
    if (!selected && (mode === "rename" || mode === "remove")) return;
    if (mode === "insert" && !selected) {
      setError("Select an anchor row (insert under)");
      return;
    }
    if (mode === "insert") {
      if (!importLink.trim()) {
        setError("Select a raw data file under Import from...");
        return;
      }
      if (!importCol.trim()) {
        setError("Enter a Data Column letter.");
        return;
      }
    }

    setApplying(true);
    setError(null);
    setMessage(null);

    let body: Record<string, unknown> = {
      dryRun: false,
      ...(uploadToken.trim() ? { uploadToken: uploadToken.trim() } : {}),
    };
    if (mode === "rename" && selected) {
      body = {
        ...body,
        action: "rename",
        currentMeter: selected.meter,
        currentLocation: selected.location,
        newMeter: meter,
        newLocation: location,
      };
    } else if (mode === "insert" && selected) {
      body = {
        ...body,
        action: "insert",
        anchorMeter: selected.meter,
        anchorLocation: selected.location,
        meter,
        location,
        kind,
        importLink: Number(importLink),
        importCol,
        feedInTariffColumns: feedInCols,
        ...(recCol.trim()
          ? { recLink: Number(importLink), recCol: recCol.trim() }
          : {}),
      };
    } else if (mode === "remove" && selected) {
      body = {
        ...body,
        action: "remove",
        meter: selected.meter,
        location: selected.location,
      };
    }

    try {
      const res = await fetch("/api/master-sheets/top-10/editor", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Request failed");
        return;
      }
      setMessage(
        json.backupDir
          ? `Saved. Backup: ${json.backupDir}`
          : "No file changes.",
      );
      await loadSchema();
      setSelected(null);
    } catch {
      setError("Network error");
    } finally {
      setApplying(false);
    }
  };

  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      backdropLabel="Close Top 10 editor"
      overlayClassName="z-[60]"
      panelClassName="flex max-h-[min(40rem,calc(100vh-2rem))] max-w-[44rem] flex-col rounded-lg border border-slate-300 p-0 shadow-xl"
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Edit Excels — Top 10 / WebSS_Data
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Excel + <code className="text-[10px]">top-10-rawdata-rows.json</code>{" "}
          (source: <span className="font-mono">{mappingSource}</span>)
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {(["rename", "insert", "remove"] as EditorMode[]).map((m) => (
            <Button
              key={m}
              type="button"
              size="sm"
              variant={mode === m ? "default" : "outline"}
              className="h-7 px-2 text-[11px] leading-tight"
              onClick={() => setMode(m)}
            >
              {EDITOR_MODE_LABELS[m]}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            type="search"
            placeholder="Search meter or location…"
            className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <p className="text-[10px] text-slate-500">
            {mode === "insert"
              ? "Select anchor row — new meter inserts directly below."
              : mode === "remove"
                ? "Select row to remove (hard delete)."
                : "Select row to rename."}
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto rounded border border-slate-100">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-4 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 text-xs">
                {filtered.map((row) => (
                  <Fragment key={`${row.sheetRow}-${row.meter}-${row.location}`}>
                    <li>
                      <button
                        type="button"
                        className={`w-full px-2 py-1.5 text-left hover:bg-slate-50 ${
                          selected?.sheetRow === row.sheetRow
                            ? "bg-brand-light/80"
                            : ""
                        }`}
                        onClick={() => setSelected(row)}
                      >
                        <span className="font-mono font-medium">{row.meter}</span>
                        <span className="text-slate-500"> @ </span>
                        <span>{row.location}</span>
                        {!row.mapped && (
                          <span className="ml-1 text-amber-600">(unmapped)</span>
                        )}
                      </button>
                    </li>
                    {mode === "insert" &&
                      selected?.sheetRow === row.sheetRow && (
                        <li className="list-none py-1" aria-hidden>
                          <div
                            className="mx-1 h-0.5 rounded-full bg-brand shadow-sm"
                            title="New row inserts here"
                          />
                        </li>
                      )}
                  </Fragment>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex w-56 shrink-0 flex-col gap-2.5 overflow-y-auto text-xs">
          {mode === "insert" && (
            <div className="space-y-1.5">
              <Label htmlFor="top10-insert-kind" className="text-xs font-medium">
                Kind
              </Label>
              <StableSelect
                id="top10-insert-kind"
                value={kind}
                options={INSERT_KIND_OPTIONS}
                onValueChange={(v) => setKind(v as InsertKind)}
                triggerClassName="h-8 text-xs"
                contentClassName="text-xs"
              />
            </div>
          )}

          {(mode === "rename" || mode === "insert") && (
            <>
              <label className="font-medium text-slate-700">
                {mode === "insert" ? "New meter" : "New Meter Name"}
              </label>
              <input
                className="rounded border border-slate-200 px-2 py-1 font-mono"
                value={meter}
                onChange={(e) => setMeter(e.target.value)}
                disabled={mode === "rename" && !selected}
              />
              <label className="font-medium text-slate-700">
                {mode === "insert" ? "Location Name" : "New Location Name"}
              </label>
              <textarea
                className="min-h-[3rem] rounded border border-slate-200 px-2 py-1"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={mode === "rename" && !selected}
              />
            </>
          )}

          {mode === "insert" && (
            <>
              <div className="space-y-1.5">
                <Label
                  htmlFor="top10-insert-import"
                  className="text-xs font-medium"
                >
                  Import from...
                </Label>
                <StableSelect
                  id="top10-insert-import"
                  value={importLink}
                  placeholder="Select raw data file"
                  options={importFileOptions}
                  onValueChange={setImportLink}
                  triggerClassName="h-8 font-mono text-xs"
                  contentClassName="text-xs font-mono"
                />
              </div>
              <label className="font-medium text-slate-700">Data Column</label>
              <input
                className="rounded border border-slate-200 px-2 py-1 font-mono uppercase"
                value={importCol}
                onChange={(e) => setImportCol(e.target.value)}
                placeholder="Ex: M"
                aria-label="Data Column"
              />
              {kind === "solar" && (
                <>
                  <label className="font-medium text-slate-700">REC Column</label>
                  <input
                    className="rounded border border-slate-200 px-2 py-1 font-mono uppercase"
                    value={recCol}
                    onChange={(e) => setRecCol(e.target.value)}
                    placeholder="Optional"
                    aria-label="REC Column"
                  />
                  <label className="font-medium text-slate-700">
                    Daily Feed-in Column(s)
                  </label>
                  <input
                    className="rounded border border-slate-200 px-2 py-1 font-mono"
                    value={feedInCols}
                    onChange={(e) => setFeedInCols(e.target.value)}
                    placeholder="Ex: Q, AU"
                  />
                </>
              )}
            </>
          )}

          {mode === "remove" && (
            <p className="text-[11px] text-slate-600">
              Removes WebSS row and mapping entry. Blocks Outdoor Air
              Temperature, Sum CCP1 (aggregate300), and empty spacer rows.
            </p>
          )}

          <Button
            type="button"
            size="sm"
            disabled={applying || !selected}
            className={mode === "remove" ? "bg-red-600 text-white hover:bg-red-700" : undefined}
            onClick={requestPrimaryAction}
          >
            {applying
              ? "Saving…"
              : mode === "remove"
                ? "Remove"
                : mode === "insert"
                  ? "Add meter"
                  : "Apply rename"}
          </Button>
        </div>
      </div>

      <div className="space-y-1 border-t border-slate-200 px-4 py-2">
        {error && (
          <p className="text-[11px] text-red-600" role="alert">
            {error}
          </p>
        )}
        {message && <p className="text-[11px] text-green-700">{message}</p>}
      </div>

      <div className="flex gap-2 border-t border-slate-200 px-4 py-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={applying}
          onClick={onBackToPicker}
        >
          Reset
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <Top10SumCcp1RemoveDialog
        open={sumCcp1RemoveOpen}
        meter={selected?.meter ?? ""}
        location={selected?.location ?? ""}
        applying={applying}
        onCancel={() => setSumCcp1RemoveOpen(false)}
        onContinue={() => {
          setSumCcp1RemoveOpen(false);
          void postAction();
        }}
      />
    </ModalOverlay>
  );
}
