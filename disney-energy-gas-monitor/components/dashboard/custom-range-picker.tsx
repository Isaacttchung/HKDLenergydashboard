"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { formatIsoDateShort, formatIsoRangeShort } from "@/lib/date-display";
import { cn } from "@/lib/utils";
import {
  format,
  isAfter,
  isBefore,
  isSameDay,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import { BoundedDayPicker } from "@/components/dashboard/bounded-day-picker";
import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";

interface CustomRangePickerProps {
  customFrom: string;
  customTo: string;
  minDate: string;
  maxDate: string;
  onRangeCommit: (from: string, to: string) => void;
  onClearSelection: () => void;
}

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const date = parseISO(iso);
  return isValid(date) ? startOfDay(date) : undefined;
}

function normalizeRange(from: Date, to: Date): { from: string; to: string } {
  const a = startOfDay(from);
  const b = startOfDay(to);
  if (a <= b) {
    return {
      from: format(a, "yyyy-MM-dd"),
      to: format(b, "yyyy-MM-dd"),
    };
  }
  return {
    from: format(b, "yyyy-MM-dd"),
    to: format(a, "yyyy-MM-dd"),
  };
}

function isBetweenDays(day: Date, start: Date, end: Date): boolean {
  const d = startOfDay(day);
  const s = startOfDay(start);
  const e = startOfDay(end);
  return isAfter(d, s) && isBefore(d, e);
}

export function CustomRangePicker({
  customFrom,
  customTo,
  minDate,
  maxDate,
  onRangeCommit,
  onClearSelection,
}: CustomRangePickerProps) {
  const minDay = useMemo(() => parseISO(minDate), [minDate]);
  const maxDay = useMemo(() => startOfDay(parseISO(maxDate)), [maxDate]);

  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [hoverDay, setHoverDay] = useState<Date | null>(null);
  const [displayMonth, setDisplayMonth] = useState(() => new Date());

  const committedFrom = isoToDate(customFrom);
  const committedTo = isoToDate(customTo);
  const hasCommittedRange = Boolean(committedFrom && committedTo);

  const previewEnd = draftStart && hoverDay ? hoverDay : null;

  const boxLabel = draftStart
    ? `Start ${formatIsoDateShort(format(draftStart, "yyyy-MM-dd"))} — pick end`
    : hasCommittedRange
      ? formatIsoRangeShort(customFrom, customTo)
      : "Select date range";

  const handleDayClick = (day: Date) => {
    const clicked = startOfDay(day);
    if (clicked < minDay || clicked > maxDay) {
      return;
    }

    if (!draftStart) {
      setDraftStart(clicked);
      setHoverDay(null);
      return;
    }

    const normalized = normalizeRange(draftStart, clicked);
    setDraftStart(null);
    setHoverDay(null);
    onRangeCommit(normalized.from, normalized.to);
    setOpen(false);
  };

  const modifiers = useMemo(() => {
    const rangeStart = draftStart ?? committedFrom;
    const rangeEnd = draftStart
      ? previewEnd && !isSameDay(draftStart, previewEnd)
        ? previewEnd
        : draftStart
      : committedTo;

    return {
      range_start: (date: Date) =>
        rangeStart ? isSameDay(date, rangeStart) : false,
      range_end: (date: Date) =>
        rangeEnd && rangeStart && !isSameDay(rangeStart, rangeEnd)
          ? isSameDay(date, rangeEnd)
          : rangeStart
            ? isSameDay(date, rangeStart)
            : false,
      range_middle: (date: Date) => {
        if (!rangeStart || !rangeEnd) return false;
        if (isSameDay(rangeStart, rangeEnd)) return false;
        const start = isBefore(rangeStart, rangeEnd) ? rangeStart : rangeEnd;
        const end = isAfter(rangeStart, rangeEnd) ? rangeStart : rangeEnd;
        return isBetweenDays(date, start, end);
      },
    };
  }, [committedFrom, committedTo, draftStart, previewEnd]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setDraftStart(null);
      setHoverDay(null);
    } else if (committedFrom) {
      setDisplayMonth(committedFrom);
    } else {
      setDisplayMonth(maxDay > new Date() ? new Date() : maxDay);
    }
  };

  const handleReset = () => {
    setDraftStart(null);
    setHoverDay(null);
    setDisplayMonth(maxDay > new Date() ? new Date() : maxDay);
    onClearSelection();
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="custom-range-display">Date range</Label>
      <div
        id="custom-range-display"
        className="flex h-9 w-full overflow-hidden rounded-md border border-slate-200 bg-white text-sm shadow-sm"
      >
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center px-3",
            !hasCommittedRange && !draftStart && "text-slate-400",
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
              aria-label="Open calendar to select date range"
            >
              <CalendarDays className="h-4 w-4 text-slate-600" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" className="w-auto p-2">
            <p className="mb-2 px-1 text-xs text-slate-500">
              Click start date, then end date.
            </p>
            <BoundedDayPicker
              minDate={minDate}
              maxDate={maxDate}
              modifiers={modifiers}
              modifiersClassNames={{
                range_start: "rdp-range_start",
                range_end: "rdp-range_end",
                range_middle: "rdp-range_middle",
              }}
              onDayClick={handleDayClick}
              onDayMouseEnter={(day) => {
                if (draftStart) setHoverDay(startOfDay(day));
              }}
              onDayMouseLeave={() => setHoverDay(null)}
              month={displayMonth}
              onMonthChange={setDisplayMonth}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1 h-8 w-full border-brand-border text-xs text-brand-foreground hover:bg-brand-light"
              onClick={handleReset}
            >
              Reset selection
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
