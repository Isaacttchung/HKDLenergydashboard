import { format, isValid, parseISO } from "date-fns";

/** Display ISO date (yyyy-MM-dd) as DD/MM/YY for UI labels. */
export function formatIsoDateShort(iso: string): string {
  const date = parseISO(iso);
  if (!isValid(date)) return iso;
  return format(date, "dd/MM/yy");
}

export function formatIsoRangeShort(from: string, to: string): string {
  return `${formatIsoDateShort(from)} – ${formatIsoDateShort(to)}`;
}

/** Display yyyy-MM as MM/YYYY for month picker labels. */
export function formatIsoMonthShort(monthKey: string): string {
  const date = parseISO(`${monthKey}-01`);
  if (!isValid(date)) return monthKey;
  return format(date, "MM/yyyy");
}
