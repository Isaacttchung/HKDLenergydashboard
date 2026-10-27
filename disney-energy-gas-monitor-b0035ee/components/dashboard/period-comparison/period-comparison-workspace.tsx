"use client";

import { PeriodComparisonResults } from "@/components/dashboard/period-comparison/period-comparison-tables";
import type { PeriodComparisonPeriod } from "@/components/dashboard/period-comparison/period-comparison-tables";
import { MonthPicker } from "@/components/dashboard/month-picker";
import { SingleDayPicker } from "@/components/dashboard/single-day-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DailyBreakdown } from "@/lib/types";
import type { PeriodComparisonContextMetrics } from "@/lib/period-comparison/context-metric-rows";
import type { PeriodComparisonMode } from "@/lib/period-comparison/resolve-breakdown";
import { buildYearOptions } from "@/lib/time-presets";
import { X } from "lucide-react";
import { useId, useState, type Dispatch, type SetStateAction } from "react";

interface PeriodComparisonApiPeriod {
  label: string;
  tableTitle: string;
  breakdown: DailyBreakdown;
  context: PeriodComparisonContextMetrics;
}

interface PeriodComparisonResult {
  mode: PeriodComparisonMode;
  periods: PeriodComparisonApiPeriod[];
  percentChanges: Record<string, number | null>[];
  contextPercentChanges: Record<string, number | null>[];
}

interface PeriodComparisonWorkspaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataMinDate: string;
  dataMaxDate: string;
  defaultDay: string;
  defaultMonth: string;
  defaultYear: string;
}

const MODE_OPTIONS: { value: PeriodComparisonMode; label: string }[] = [
  { value: "day", label: "Date vs date" },
  { value: "month", label: "Month vs month" },
  { value: "year", label: "Year vs year" },
];

const MAX_PERIODS = 8;

function defaultYearPair(
  defaultYear: string,
  yearOptions: string[],
): [string, string] {
  const prior = String(Number(defaultYear) - 1);
  return [
    defaultYear,
    yearOptions.includes(prior) ? prior : defaultYear,
  ];
}

export function PeriodComparisonWorkspace({
  open,
  onOpenChange,
  dataMinDate,
  dataMaxDate,
  defaultDay,
  defaultMonth,
  defaultYear,
}: PeriodComparisonWorkspaceProps) {
  const titleId = useId();
  const dataMinMonth = dataMinDate.slice(0, 7);
  const dataMaxMonth = dataMaxDate.slice(0, 7);
  const dataMinYear = dataMinDate.slice(0, 4);
  const dataMaxYear = dataMaxDate.slice(0, 4);
  const yearOptions = buildYearOptions(dataMinYear, dataMaxYear);

  const [mode, setMode] = useState<PeriodComparisonMode | null>(null);
  const [days, setDays] = useState<string[]>([defaultDay, defaultDay]);
  const [months, setMonths] = useState<string[]>([defaultMonth, defaultMonth]);
  const [years, setYears] = useState<string[]>(() =>
    defaultYearPair(defaultYear, yearOptions),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PeriodComparisonResult | null>(null);

  const resetPeriodValues = () => {
    setDays([defaultDay, defaultDay]);
    setMonths([defaultMonth, defaultMonth]);
    setYears(defaultYearPair(defaultYear, yearOptions));
  };

  const resetFlow = () => {
    setMode(null);
    setResult(null);
    setError(null);
    setLoading(false);
    resetPeriodValues();
  };

  const selectMode = (next: PeriodComparisonMode) => {
    setMode(next);
    setResult(null);
    setError(null);
    if (next === "day") {
      setDays([defaultDay, defaultDay]);
    }
    if (next === "month") {
      setMonths([defaultMonth, defaultMonth]);
    }
    if (next === "year") {
      setYears(defaultYearPair(defaultYear, yearOptions));
    }
  };

  const updatePeriodList = (
    setter: Dispatch<SetStateAction<string[]>>,
    index: number,
    value: string,
  ) => {
    setter((prev) => prev.map((entry, i) => (i === index ? value : entry)));
    setResult(null);
  };

  const addPeriod = (
    setter: Dispatch<SetStateAction<string[]>>,
    fallback: string,
  ) => {
    setter((prev) => {
      if (prev.length >= MAX_PERIODS) return prev;
      return [...prev, prev[prev.length - 1] ?? fallback];
    });
    setResult(null);
  };

  const removePeriod = (
    setter: Dispatch<SetStateAction<string[]>>,
    index: number,
  ) => {
    setter((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setResult(null);
  };

  const generate = async () => {
    if (!mode) return;

    const params = new URLSearchParams({ mode });
    let periodKeys: string[] = [];

    if (mode === "day") {
      periodKeys = days;
    } else if (mode === "month") {
      periodKeys = months;
    } else {
      periodKeys = years;
    }

    if (new Set(periodKeys).size !== periodKeys.length) {
      setError("Each period must be different.");
      setResult(null);
      return;
    }

    for (const key of periodKeys) {
      params.append("periods", key);
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/period-comparison?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to build comparison");
      }
      setResult(json as PeriodComparisonResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build comparison");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const periodLabel =
    mode === "day" ? "Date" : mode === "month" ? "Month" : "Year";

  const resultPeriods: PeriodComparisonPeriod[] | null = result
    ? result.periods.map((p) => ({
        tableTitle: p.tableTitle,
        breakdown: p.breakdown,
        context: p.context ?? {},
      }))
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label="Close period comparison"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-brand-border bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-brand-border px-4 py-3">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-brand-foreground">
              Period comparison
            </h2>
            <p className="text-xs text-slate-500">
              Compare full resort data across multiple dates, months, or years.
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
          {!mode && (
            <div className="grid gap-2 sm:grid-cols-3">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectMode(option.value)}
                  className="rounded-lg border border-brand-border bg-white px-4 py-6 text-sm font-medium text-brand-foreground transition-colors hover:border-brand hover:bg-brand-light"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {mode && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={resetFlow}>
                  Change comparison type
                </Button>
                <span className="text-xs text-slate-500">
                  {MODE_OPTIONS.find((o) => o.value === mode)?.label}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {mode === "day" &&
                  days.map((day, index) => (
                    <div key={`date-${index}`} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={`period-comp-date-${index}`}>
                          Date {index + 1}
                        </Label>
                        {days.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-slate-500 hover:text-red-600"
                            aria-label={`Remove date ${index + 1}`}
                            onClick={() => removePeriod(setDays, index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <SingleDayPicker
                        id={`period-comp-date-${index}`}
                        showLabel={false}
                        value={day}
                        minDate={dataMinDate}
                        maxDate={dataMaxDate}
                        onChange={(value) => updatePeriodList(setDays, index, value)}
                      />
                    </div>
                  ))}

                {mode === "month" &&
                  months.map((month, index) => (
                    <div key={`month-${index}`} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={`period-comp-month-${index}`}>
                          Month {index + 1}
                        </Label>
                        {months.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-slate-500 hover:text-red-600"
                            aria-label={`Remove month ${index + 1}`}
                            onClick={() => removePeriod(setMonths, index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <MonthPicker
                        id={`period-comp-month-${index}`}
                        showLabel={false}
                        value={month}
                        minMonth={dataMinMonth}
                        maxMonth={dataMaxMonth}
                        onChange={(value) =>
                          updatePeriodList(setMonths, index, value)
                        }
                      />
                    </div>
                  ))}

                {mode === "year" &&
                  years.map((year, index) => (
                    <div key={`year-${index}`} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={`period-comp-year-${index}`}>
                          Year {index + 1}
                        </Label>
                        {years.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-slate-500 hover:text-red-600"
                            aria-label={`Remove year ${index + 1}`}
                            onClick={() => removePeriod(setYears, index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Select
                        value={year}
                        onValueChange={(value) =>
                          updatePeriodList(setYears, index, value)
                        }
                      >
                        <SelectTrigger id={`period-comp-year-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={generate} disabled={loading}>
                  {loading ? "Generating…" : "Generate comparison"}
                </Button>
                {mode === "day" && days.length < MAX_PERIODS && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addPeriod(setDays, defaultDay)}
                  >
                    Add date
                  </Button>
                )}
                {mode === "month" && months.length < MAX_PERIODS && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addPeriod(setMonths, defaultMonth)}
                  >
                    Add month
                  </Button>
                )}
                {mode === "year" && years.length < MAX_PERIODS && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addPeriod(setYears, defaultYear)}
                  >
                    Add year
                  </Button>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {result && resultPeriods && (
            <div className="mt-6 space-y-3">
              <p className="text-xs text-slate-500">
                {result.periods
                  .map((period, index) => `${periodLabel} ${index + 1}: ${period.label}`)
                  .join(" · ")}
              </p>
              <PeriodComparisonResults
                periods={resultPeriods}
                percentChanges={result.percentChanges}
                contextPercentChanges={result.contextPercentChanges ?? []}
              />
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-brand-border bg-brand-light/40 px-4 py-3">
          <div className="ml-auto flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={resetFlow}>
              Reset
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
