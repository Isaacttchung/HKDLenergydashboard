"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { formatIsoDateShort } from "@/lib/date-display";
import { cn } from "@/lib/utils";
import {
  format,
  isSameDay,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import { BoundedDayPicker } from "@/components/dashboard/bounded-day-picker";
import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";

interface SingleDayPickerProps {
  value: string;
  minDate: string;
  maxDate: string;
  onChange: (iso: string) => void;
  /** When false, omit the built-in "Date" label (use an external label). */
  showLabel?: boolean;
  id?: string;
}

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const date = parseISO(iso);
  return isValid(date) ? startOfDay(date) : undefined;
}

export function SingleDayPicker({
  value,
  minDate,
  maxDate,
  onChange,
  showLabel = true,
  id: idProp,
}: SingleDayPickerProps) {
  const controlId = idProp ?? "single-day-display";
  const minDay = useMemo(() => parseISO(minDate), [minDate]);
  const maxDay = useMemo(() => startOfDay(parseISO(maxDate)), [maxDate]);
  const [open, setOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(() => new Date());

  const selected = isoToDate(value);
  const boxLabel = value ? formatIsoDateShort(value) : "Select date";

  const handleDayClick = (day: Date) => {
    const clicked = startOfDay(day);
    if (clicked < minDay || clicked > maxDay) {
      return;
    }
    onChange(format(clicked, "yyyy-MM-dd"));
    setOpen(false);
  };

  const modifiers = useMemo(
    () => ({
      selected: (date: Date) => (selected ? isSameDay(date, selected) : false),
    }),
    [selected],
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setDisplayMonth(selected ?? new Date());
    }
  };

  return (
    <div className={showLabel ? "space-y-2" : undefined}>
      {showLabel && <Label htmlFor={controlId}>Date</Label>}
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
              aria-label="Open calendar to select date"
            >
              <CalendarDays className="h-4 w-4 text-slate-600" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" className="w-auto p-2">
            <BoundedDayPicker
              minDate={minDate}
              maxDate={maxDate}
              modifiers={modifiers}
              modifiersClassNames={{ selected: "rdp-selected" }}
              onDayClick={handleDayClick}
              month={displayMonth}
              onMonthChange={setDisplayMonth}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
