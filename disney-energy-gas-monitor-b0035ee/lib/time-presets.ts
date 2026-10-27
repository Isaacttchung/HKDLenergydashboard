import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import type { CompareType, TimePreset } from "@/lib/types";

export function getToday(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function getCurrentMonth(): string {
  return format(new Date(), "yyyy-MM");
}

export function getCurrentYear(): string {
  return format(new Date(), "yyyy");
}

/** Fallback when master sheets are missing; matches earliest HKDL workbook data. */
export const DATA_MIN_DATE = "2018-07-01";
export const DATA_MIN_MONTH = "2018-07";
export const DATA_MIN_YEAR = "2018";

/** Latest selectable day: no later than today or loaded data. */
export function capSelectableMaxDate(latestDataDate: string): string {
  const today = getToday();
  return latestDataDate < today ? latestDataDate : today;
}

export function clampIsoDate(
  date: string,
  minDate: string,
  maxDate: string,
): string {
  if (date < minDate) return minDate;
  if (date > maxDate) return maxDate;
  return date;
}

export function clampMonthKey(
  monthKey: string,
  minMonth: string,
  maxMonth: string,
): string {
  if (monthKey < minMonth) return minMonth;
  if (monthKey > maxMonth) return maxMonth;
  return monthKey;
}

export function clampYearKey(
  year: string,
  minYear: string,
  maxYear: string,
): string {
  if (year < minYear) return minYear;
  if (year > maxYear) return maxYear;
  return year;
}

export function buildYearOptions(minYear: string, maxYear: string): string[] {
  const min = Number(minYear);
  const max = Number(maxYear);
  const years: string[] = [];
  for (let y = max; y >= min; y -= 1) {
    years.push(String(y));
  }
  return years;
}

export function shiftDay(date: string, deltaDays: number): string {
  const base = parseISO(date);
  const next = deltaDays >= 0 ? addDays(base, deltaDays) : subDays(base, -deltaDays);
  return format(next, "yyyy-MM-dd");
}

export function shiftMonth(monthKey: string, deltaMonths: number): string {
  const base = parseISO(`${monthKey}-01`);
  const next =
    deltaMonths >= 0 ? addMonths(base, deltaMonths) : subMonths(base, -deltaMonths);
  return format(next, "yyyy-MM");
}

export function shiftYear(year: string, deltaYears: number): string {
  return String(Number(year) + deltaYears);
}

export function canShiftDay(
  date: string,
  deltaDays: number,
  minDate: string,
  maxDate: string,
): boolean {
  const next = shiftDay(date, deltaDays);
  return next >= minDate && next <= maxDate;
}

export function canShiftMonth(
  monthKey: string,
  deltaMonths: number,
  minMonth: string,
  maxMonth: string,
): boolean {
  const next = shiftMonth(monthKey, deltaMonths);
  return next >= minMonth && next <= maxMonth;
}

export function canShiftYear(
  year: string,
  deltaYears: number,
  minYear: string,
  maxYear: string,
): boolean {
  const next = shiftYear(year, deltaYears);
  return next >= minYear && next <= maxYear;
}

export function resolveDateRange(
  timePreset: TimePreset,
  from?: string,
  to?: string,
  singleDay?: string,
  selectedMonth?: string,
  selectedYear?: string,
): { from: string; to: string } {
  const today = new Date();

  switch (timePreset) {
    case "ytd": {
      const year = selectedYear || format(today, "yyyy");
      return {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
      };
    }
    case "month": {
      const month = selectedMonth || format(today, "yyyy-MM");
      const monthStart = parseISO(`${month}-01`);
      return {
        from: format(startOfMonth(monthStart), "yyyy-MM-dd"),
        to: format(endOfMonth(monthStart), "yyyy-MM-dd"),
      };
    }
    case "day": {
      const day = singleDay || from || format(today, "yyyy-MM-dd");
      return { from: day, to: day };
    }
    case "custom":
    default:
      return {
        from: from || format(startOfYear(today), "yyyy-MM-dd"),
        to: to || format(today, "yyyy-MM-dd"),
      };
  }
}

export function resolveComparisonRange(
  compareType: CompareType,
  from: string,
  to: string,
  compareFrom?: string,
  compareTo?: string,
): { from: string; to: string } {
  if (compareFrom && compareTo) {
    return { from: compareFrom, to: compareTo };
  }

  const start = new Date(from);
  const end = new Date(to);

  if (compareType === "year") {
    return {
      from: format(subYears(start, 1), "yyyy-MM-dd"),
      to: format(subYears(end, 1), "yyyy-MM-dd"),
    };
  }

  const diffMs = end.getTime() - start.getTime();
  const compareEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const compareStart = new Date(compareEnd.getTime() - diffMs);

  return {
    from: format(compareStart, "yyyy-MM-dd"),
    to: format(compareEnd, "yyyy-MM-dd"),
  };
}
