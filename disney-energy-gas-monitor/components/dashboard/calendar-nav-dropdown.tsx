"use client";

import type { ChangeEvent, ComponentProps } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DropdownProps } from "react-day-picker";

/** Radix select styled like sidebar filters; replaces react-day-picker native dropdowns. */
export function CalendarNavDropdown({
  options,
  value,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: DropdownProps) {
  const stringValue =
    value === undefined || value === null ? undefined : String(value);

  const selected = options?.find((option) => option.value === value);
  const isYearDropdown =
    options != null &&
    options.length > 0 &&
    options.every((option) => option.value > 100);

  const handleValueChange = (next: string) => {
    onChange?.({
      target: { value: next },
    } as ChangeEvent<HTMLSelectElement>);
  };

  const releaseFocusAfterClose = (open: boolean) => {
    if (open) return;
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        active.blur();
      }
    });
  };

  return (
    <Select
      value={stringValue}
      onValueChange={handleValueChange}
      onOpenChange={releaseFocusAfterClose}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          "h-8 border-brand-border bg-white px-2 text-xs font-medium text-brand-foreground shadow-sm",
          "outline-none focus:outline-none focus:ring-0 focus-visible:ring-0",
          "focus-visible:border-brand data-[state=open]:border-brand",
          isYearDropdown ? "w-[4.85rem]" : "w-[5.65rem]",
          className,
        )}
      >
        <SelectValue placeholder={selected?.label ?? "—"} />
      </SelectTrigger>
      <SelectContent
        className="z-[100] max-h-56 border-brand-border bg-white"
        position="popper"
      >
        {options?.map((option) => (
          <SelectItem
            key={option.value}
            value={String(option.value)}
            disabled={option.disabled}
            className="text-xs focus:bg-brand-light focus:text-brand-foreground"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
