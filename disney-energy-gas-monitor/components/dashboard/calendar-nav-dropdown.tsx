"use client";

import { StableSelect } from "@/components/ui/stable-select";
import { cn } from "@/lib/utils";
import type { ChangeEvent, ComponentProps } from "react";
import type { DropdownProps } from "react-day-picker";

/** Select-style dropdown without Radix Select scroll-lock. */
export function CalendarNavDropdown({
  options,
  value,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: DropdownProps) {
  const stringValue =
    value === undefined || value === null ? "" : String(value);

  const isYearDropdown =
    options != null &&
    options.length > 0 &&
    options.every((option) => option.value > 100);

  const selectOptions =
    options?.map((option) => ({
      value: String(option.value),
      label: option.label,
      disabled: option.disabled,
    })) ?? [];

  return (
    <StableSelect
      aria-label={ariaLabel}
      disabled={disabled}
      value={stringValue}
      options={selectOptions}
      onValueChange={(next) => {
        onChange?.({
          target: { value: next },
        } as ChangeEvent<HTMLSelectElement>);
      }}
      triggerClassName={cn(
        "h-8 border-brand-border px-2 text-xs font-medium text-brand-foreground shadow-sm",
        "focus-visible:border-brand focus-visible:ring-0",
        isYearDropdown ? "w-[4.85rem]" : "w-[5.65rem]",
        className,
      )}
      contentClassName="z-[100] max-h-56 border-brand-border text-xs [&_button]:text-xs [&_button]:focus:bg-brand-light [&_button]:focus:text-brand-foreground"
    />
  );
}

export function CalendarDropdownNav({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "flex flex-wrap items-center justify-start gap-1.5",
        className,
      )}
    />
  );
}
