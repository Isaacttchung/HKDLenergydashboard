"use client";

import { CustomRangePicker } from "@/components/dashboard/custom-range-picker";
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
import type { TimePreset } from "@/lib/types";
import { buildYearOptions } from "@/lib/time-presets";
import { cn } from "@/lib/utils";

interface TimeFilterProps {
  timePreset: TimePreset;
  singleDay: string;
  selectedMonth: string;
  selectedYear: string;
  customFrom: string;
  customTo: string;
  dataMinDate: string;
  dataMaxDate: string;
  onPresetChange: (preset: TimePreset) => void;
  onSingleDayChange: (day: string) => void;
  onSelectedMonthChange: (month: string) => void;
  onSelectedYearChange: (year: string) => void;
  onCustomRangeCommit: (from: string, to: string) => void;
  onClearCustomRange: () => void;
  onReset: () => void;
}

const PRESETS: { value: TimePreset; label: string }[] = [
  { value: "ytd", label: "Year" },
  { value: "month", label: "Month" },
  { value: "day", label: "Single day" },
  { value: "custom", label: "Custom range" },
];

export function TimeFilter({
  timePreset,
  singleDay,
  selectedMonth,
  selectedYear,
  customFrom,
  customTo,
  dataMinDate,
  dataMaxDate,
  onPresetChange,
  onSingleDayChange,
  onSelectedMonthChange,
  onSelectedYearChange,
  onCustomRangeCommit,
  onClearCustomRange,
  onReset,
}: TimeFilterProps) {
  const dataMinMonth = dataMinDate.slice(0, 7);
  const dataMaxMonth = dataMaxDate.slice(0, 7);
  const dataMinYear = dataMinDate.slice(0, 4);
  const dataMaxYear = dataMaxDate.slice(0, 4);
  const yearOptions = buildYearOptions(dataMinYear, dataMaxYear);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-brand-foreground">Time frame</h3>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onPresetChange(preset.value)}
            className={cn(
              "rounded-md border px-3 py-2 text-sm transition-colors",
              timePreset === preset.value
                ? "border-brand bg-brand text-white"
                : "border-brand-border bg-white text-brand-foreground hover:bg-brand-light",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {timePreset === "ytd" && (
        <div className="space-y-2">
          <Label htmlFor="selected-year">Year</Label>
          <Select value={selectedYear} onValueChange={onSelectedYearChange}>
            <SelectTrigger id="selected-year">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {timePreset === "month" && (
        <MonthPicker
          value={selectedMonth}
          minMonth={dataMinMonth}
          maxMonth={dataMaxMonth}
          onChange={onSelectedMonthChange}
        />
      )}

      {timePreset === "day" && (
        <SingleDayPicker
          value={singleDay}
          minDate={dataMinDate}
          maxDate={dataMaxDate}
          onChange={onSingleDayChange}
        />
      )}

      {timePreset === "custom" && (
        <CustomRangePicker
          customFrom={customFrom}
          customTo={customTo}
          minDate={dataMinDate}
          maxDate={dataMaxDate}
          onRangeCommit={onCustomRangeCommit}
          onClearSelection={onClearCustomRange}
        />
      )}

      <Button type="button" variant="outline" className="w-full" onClick={onReset}>
        Reset filters
      </Button>
    </div>
  );
}
