"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { CustomGraphSeriesDefinition } from "@/lib/custom-graph/types";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

interface CustomGraphPickerProps {
  catalog: CustomGraphSeriesDefinition[];
  loadingCatalog: boolean;
  generating: boolean;
  onGenerate: (seriesIds: string[]) => void;
  onCancel?: () => void;
}

export function CustomGraphPicker({
  catalog,
  loadingCatalog,
  generating,
  onGenerate,
  onCancel,
}: CustomGraphPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const map = new Map<string, CustomGraphSeriesDefinition[]>();
    for (const item of catalog) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()];
  }, [catalog]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Choose one or more series to plot over time. Matching units share the left
        axis; other units use the right axis.
      </p>

      {loadingCatalog ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading options…
        </p>
      ) : (
        <div className="max-h-[min(40vh,320px)] space-y-4 overflow-y-auto pr-1">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {category}
              </p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <Checkbox
                      id={`custom-series-${item.id}`}
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggle(item.id)}
                    />
                    <Label
                      htmlFor={`custom-series-${item.id}`}
                      className="cursor-pointer text-sm font-normal leading-snug"
                    >
                      {item.label}{" "}
                      <span className="text-slate-400">({item.unitLabel})</span>
                    </Label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-brand-border pt-3">
        <Button
          type="button"
          disabled={selected.size === 0 || generating}
          onClick={() => onGenerate([...selected])}
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Building…
            </>
          ) : (
            "Generate graph"
          )}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
