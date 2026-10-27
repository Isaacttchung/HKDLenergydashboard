"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { formatIsoMonthShort } from "@/lib/date-display";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";

interface MonthPickerProps {
  value: string;
  minMonth: string;
  maxMonth: string;
  onChange: (monthKey: string) => void;
  showLabel?: boolean;
  id?: string;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function monthKeyForYear(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function MonthPicker({
  value,
  minMonth,
  maxMonth,
  onChange,
  showLabel = true,
  id: idProp,
}: MonthPickerProps) {
  const controlId = idProp ?? "selected-month-display";
  const [open, setOpen] = useState(false);
  const minYear = Number(minMonth.slice(0, 4));
  const maxYear = Number(maxMonth.slice(0, 4));
  const selectedYearFromValue = value ? Number(value.slice(0, 4)) : maxYear;
  const [displayYear, setDisplayYear] = useState(selectedYearFromValue);

  const boxLabel = value ? formatIsoMonthShort(value) : "Select month";

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setDisplayYear(selectedYearFromValue);
    }
  };

  const canGoPreviousYear = displayYear > minYear;
  const canGoNextYear = displayYear < maxYear;

  const monthStates = useMemo(() => {
    return MONTH_LABELS.map((label, index) => {
      const key = monthKeyForYear(displayYear, index);
      const inRange = key >= minMonth && key <= maxMonth;
      const selected = value === key;
      return { label, key, inRange, selected };
    });
  }, [displayYear, minMonth, maxMonth, value]);

  const selectMonth = (key: string) => {
    onChange(key);
    setOpen(false);
  };

  return (
    <div className={showLabel ? "space-y-2" : undefined}>
      {showLabel && <Label htmlFor={controlId}>Month</Label>}
      <div
        id={controlId}
        className="flex h-9 w-full overflow-hidden rounded-md border border-slate-200 bg-white text-sm shadow-sm"
      >
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center px-3",
            !value && "text-slate-400",
          )}
        >
          <span className="truncate">{boxLabel}</span>
        </div>
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-none border-l border-slate-200 hover:bg-slate-50"
              aria-label="Open calendar to select month"
            >
              <CalendarDays className="h-4 w-4 text-slate-600" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" className="w-auto p-3">
            <div className="flex items-center justify-between gap-2 pb-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!canGoPreviousYear}
                aria-label="Previous year"
                onClick={() => setDisplayYear((y) => y - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[4rem] text-center text-sm font-semibold text-brand-foreground">
                {displayYear}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!canGoNextYear}
                aria-label="Next year"
                onClick={() => setDisplayYear((y) => y + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {monthStates.map(({ label, key, inRange, selected }) => (
                <Button
                  key={key}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  size="sm"
                  disabled={!inRange}
                  className={cn(
                    "h-8 px-2 text-xs",
                    !selected && inRange && "border-slate-200",
                  )}
                  onClick={() => selectMonth(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
