import {
  endOfMonth,
  isSameDay,
  parseISO,
  startOfMonth,
} from "date-fns";

/** Every calendar month key (yyyy-MM) must exist in a monthly JSON store. */
export function everyMonthRecordedInStore(
  store: Readonly<Record<string, unknown>>,
  months: string[],
): boolean {
  if (months.length === 0) return false;
  return months.every((ym) => ym in store);
}

/** Custom ranges must start on the 1st and end on the last day of a month. */
export function isCalendarMonthAlignedRange(from: string, to: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return false;
  }
  const start = parseISO(from);
  const end = parseISO(to);
  if (end < start) return false;
  return (
    isSameDay(start, startOfMonth(start)) &&
    isSameDay(end, endOfMonth(end))
  );
}
