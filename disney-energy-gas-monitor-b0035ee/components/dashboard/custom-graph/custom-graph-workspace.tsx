"use client";

import { CustomGraphChart } from "@/components/dashboard/custom-graph/custom-graph-chart";
import { CustomGraphPicker } from "@/components/dashboard/custom-graph/custom-graph-picker";
import { useCustomGraphSession } from "@/components/dashboard/custom-graph/custom-graph-session";
import { Button } from "@/components/ui/button";
import type { CustomGraphSeriesDefinition } from "@/lib/custom-graph/types";
import type { CustomGraphChartPayload } from "@/lib/custom-graph/types";
import { X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

interface CustomGraphWorkspaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queryString: string;
  timePreset: string;
  customRangeReady: boolean;
}

export function CustomGraphWorkspace({
  open,
  onOpenChange,
  queryString,
  timePreset,
  customRangeReady,
}: CustomGraphWorkspaceProps) {
  const titleId = useId();
  const {
    graphs,
    showPicker,
    setShowPicker,
    addGraph,
    resetGraphs,
  } = useCustomGraphSession();

  const [catalog, setCatalog] = useState<CustomGraphSeriesDefinition[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoadingCatalog(true);
    fetch("/api/custom-graph?catalog=1")
      .then((res) => res.json())
      .then((json) => setCatalog(json.series ?? []))
      .catch(() => setError("Could not load graph options"))
      .finally(() => setLoadingCatalog(false));
  }, [open]);

  const generateGraph = useCallback(
    async (seriesIds: string[]) => {
      if (timePreset === "custom" && !customRangeReady) {
        setError("Select a custom date range in the sidebar first.");
        return;
      }

      setGenerating(true);
      setError(null);

      const params = new URLSearchParams(queryString);
      params.set("series", seriesIds.join(","));

      try {
        const res = await fetch(`/api/custom-graph?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? "Failed to build graph");
        }

        addGraph({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          seriesIds,
          chart: json as CustomGraphChartPayload,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to build graph");
      } finally {
        setGenerating(false);
      }
    },
    [queryString, timePreset, customRangeReady, addGraph],
  );

  const resetAll = () => {
    resetGraphs();
    setError(null);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label="Close custom graphs"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(92vh,880px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-brand-border bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-brand-border px-4 py-3">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-brand-foreground">
              Custom graphs
            </h2>
            <p className="text-xs text-slate-500">
              Graphs stay here until you click Reset — switching tabs only hides
              this window.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {graphs.map((slot, index) => (
            <div
              key={slot.id}
              className="mb-6 rounded-lg border border-brand-border bg-brand-light/20 p-3 last:mb-0"
            >
              <p className="mb-2 text-xs font-medium text-slate-600">
                Graph {index + 1}: {slot.chart.series.map((s) => s.label).join(" · ")}
              </p>
              <CustomGraphChart chart={slot.chart} />
            </div>
          ))}

          {showPicker && (
            <div className={graphs.length > 0 ? "mt-4 border-t border-brand-border pt-4" : ""}>
              {graphs.length > 0 && (
                <p className="mb-2 text-sm font-medium text-slate-700">Add another graph</p>
              )}
              <CustomGraphPicker
                catalog={catalog}
                loadingCatalog={loadingCatalog}
                generating={generating}
                onGenerate={generateGraph}
              />
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-brand-border bg-brand-light/40 px-4 py-3">
          {!showPicker && (
            <Button type="button" variant="secondary" onClick={() => setShowPicker(true)}>
              Add another graph
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={resetAll}
            disabled={graphs.length === 0 && showPicker}
          >
            Reset graphs
          </Button>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </footer>
      </div>
    </div>
  );
}
