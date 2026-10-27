import { format, parseISO } from "date-fns";

/** EMS daily report date label, e.g. 08-Sep-2026 */
export function formatReportDate(iso: string): string {
  return format(parseISO(iso), "dd-MMM-yyyy");
}

export function priorYearIsoDate(iso: string): string {
  const d = parseISO(iso);
  d.setFullYear(d.getFullYear() - 1);
  return format(d, "yyyy-MM-dd");
}

export function formatReportNumber(value: number, decimals = 0): string {
  return value.toLocaleString("en-HK", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatReportPercent(value: number, decimals = 1): string {
  const abs = Math.abs(value).toLocaleString("en-HK", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${value >= 0 ? "" : "-"}${abs} %`;
}

export function formatTempC(value: number): string {
  return `${value.toLocaleString("en-HK", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} °C`;
}

export function formatPct(value: number): string {
  return `${value.toLocaleString("en-HK", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`;
}

export function formatYoYDifferencePct(
  current: number,
  previous: number,
): string {
  if (previous === 0) return "—";
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}
