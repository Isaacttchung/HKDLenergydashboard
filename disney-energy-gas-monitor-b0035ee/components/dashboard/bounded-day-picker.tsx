"use client";

import {
  CalendarDropdownNav,
  CalendarNavDropdown,
} from "@/components/dashboard/calendar-nav-dropdown";
import { CalendarMonthCaption } from "@/components/dashboard/calendar-month-caption";
import { cn } from "@/lib/utils";
import { format, parseISO, startOfDay } from "date-fns";
import {
  DayPicker,
  type Matcher,
  type ModifiersClassNames,
} from "react-day-picker";
import { useMemo } from "react";
import "react-day-picker/style.css";

export interface BoundedDayPickerProps {
  minDate: string;
  maxDate: string;
  className?: string;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  modifiers?: Record<string, Matcher | Matcher[] | undefined>;
  modifiersClassNames?: ModifiersClassNames;
  onDayClick?: (day: Date) => void;
  onDayMouseEnter?: (day: Date) => void;
  onDayMouseLeave?: () => void;
}

export function BoundedDayPicker({
  minDate,
  maxDate,
  className,
  month,
  onMonthChange,
  modifiers,
  modifiersClassNames,
  onDayClick,
  onDayMouseEnter,
  onDayMouseLeave,
}: BoundedDayPickerProps) {
  const minDay = useMemo(() => parseISO(minDate), [minDate]);
  const maxDay = useMemo(() => startOfDay(parseISO(maxDate)), [maxDate]);

  return (
    <div
      className={cn(
        "custom-range-calendar overflow-x-auto",
        "[&_.rdp-root]:mx-auto [&_.rdp-root]:w-fit [&_.rdp-root]:text-xs",
        className,
      )}
    >
      <DayPicker
        captionLayout="dropdown"
        reverseYears
        startMonth={minDay}
        endMonth={maxDay}
        disabled={{ before: minDay, after: maxDay }}
        weekStartsOn={1}
        fixedWeeks
        hideNavigation
        month={month}
        onMonthChange={onMonthChange}
        modifiers={modifiers}
        modifiersClassNames={modifiersClassNames}
        onDayClick={onDayClick}
        onDayMouseEnter={onDayMouseEnter}
        onDayMouseLeave={onDayMouseLeave}
        components={{
          Dropdown: CalendarNavDropdown,
          DropdownNav: CalendarDropdownNav,
          MonthCaption: CalendarMonthCaption,
        }}
        classNames={{
          month: "relative w-full max-w-full",
          month_caption: "pb-0.5",
          button_previous: cn(
            "relative inset-auto flex h-8 w-8 items-center justify-center rounded-md border border-brand-border bg-white text-brand-foreground shadow-sm hover:bg-brand-light",
          ),
          button_next: cn(
            "relative inset-auto flex h-8 w-8 items-center justify-center rounded-md border border-brand-border bg-white text-brand-foreground shadow-sm hover:bg-brand-light",
          ),
          chevron: "fill-brand-foreground",
        }}
        formatters={{
          formatWeekdayName: (date) => format(date, "EEEEE"),
        }}
      />
    </div>
  );
}
