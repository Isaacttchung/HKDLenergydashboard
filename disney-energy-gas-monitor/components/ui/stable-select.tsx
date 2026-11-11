"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

export interface StableSelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

interface StableSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: StableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

/** Select look-alike using Popover (modal=false) — no react-remove-scroll layout shift. */
export function StableSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  disabled = false,
  "aria-label": ariaLabel,
  triggerClassName,
  contentClassName,
}: StableSelectProps) {
  const [open, setOpen] = useState(false);
  const listboxId = useId();
  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder;
  const isPlaceholder = !selected;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isPlaceholder && "text-slate-500",
            triggerClassName,
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className={cn(
          "z-[70] max-h-96 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-md border border-slate-200 bg-white p-1 text-slate-950 shadow-md",
          contentClassName,
        )}
      >
        <ul id={listboxId} role="listbox" className="max-h-80 overflow-y-auto">
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                className={cn(
                  "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
                  "hover:bg-slate-100 focus:bg-slate-100",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  {isSelected ? <Check className="h-4 w-4" /> : null}
                </span>
                <span className="truncate text-left">{option.label}</span>
              </button>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
