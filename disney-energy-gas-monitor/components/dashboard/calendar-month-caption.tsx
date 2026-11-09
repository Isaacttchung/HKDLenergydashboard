"use client";

import { cn } from "@/lib/utils";
import { useDayPicker, type MonthCaptionProps } from "react-day-picker";

/** Month/year dropdowns on the left; prev/next arrows grouped on the right. */
export function CalendarMonthCaption({
  calendarMonth: _calendarMonth,
  displayIndex: _displayIndex,
  className,
  children,
  ...rest
}: MonthCaptionProps) {
  const {
    components,
    classNames,
    labels: { labelPrevious, labelNext },
    previousMonth,
    nextMonth,
    goToMonth,
    dayPickerProps,
  } = useDayPicker();

  const { PreviousMonthButton, NextMonthButton, Chevron } = components;

  const handlePrevious = () => {
    if (!previousMonth) return;
    dayPickerProps.onPrevClick?.(previousMonth);
    goToMonth(previousMonth);
  };

  const handleNext = () => {
    if (!nextMonth) return;
    dayPickerProps.onNextClick?.(nextMonth);
    goToMonth(nextMonth);
  };

  return (
    <div
      className={cn(
        "flex w-full min-w-[15.5rem] items-center justify-between gap-2",
        className,
      )}
      {...rest}
    >
      <div className="flex min-w-0 flex-1 items-center justify-start overflow-hidden">
        {children}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <PreviousMonthButton
          type="button"
          className={classNames.button_previous}
          tabIndex={previousMonth ? undefined : -1}
          aria-disabled={previousMonth ? undefined : true}
          aria-label={labelPrevious(previousMonth)}
          onClick={handlePrevious}
        >
          <Chevron
            disabled={previousMonth ? undefined : true}
            className={classNames.chevron}
            orientation="left"
          />
        </PreviousMonthButton>
        <NextMonthButton
          type="button"
          className={classNames.button_next}
          tabIndex={nextMonth ? undefined : -1}
          aria-disabled={nextMonth ? undefined : true}
          aria-label={labelNext(nextMonth)}
          onClick={handleNext}
        >
          <Chevron
            disabled={nextMonth ? undefined : true}
            className={classNames.chevron}
            orientation="right"
          />
        </NextMonthButton>
      </div>
    </div>
  );
}
