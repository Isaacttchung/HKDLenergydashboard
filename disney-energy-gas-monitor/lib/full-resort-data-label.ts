import { format, parseISO } from "date-fns";
import type { TimePreset } from "@/lib/types";

function formatDaySlash(isoDate: string): string {
  return format(parseISO(isoDate), "dd/MM/yyyy");
}

function formatMonthSlash(fromIsoDate: string): string {
  const monthKey = fromIsoDate.slice(0, 7);
  const [year, month] = monthKey.split("-");
  return `${month}/${year}`;
}

function periodSuffix(
  timePreset: TimePreset,
  from: string,
  to?: string,
): string {
  switch (timePreset) {
    case "ytd":
      return from.slice(0, 4);
    case "month":
      return formatMonthSlash(from);
    case "day":
      return formatDaySlash(from);
    case "custom": {
      const end = to ?? from;
      return `${formatDaySlash(from)} - ${formatDaySlash(end)}`;
    }
    default:
      return "";
  }
}

/** Table category column header in the report summary (full resort, not map filter). */
export function fullResortDataColumnLabel(
  timePreset: TimePreset,
  from: string,
  to?: string,
): string {
  switch (timePreset) {
    case "day":
      return `Daily full resort kWh data (${formatDaySlash(from)})`;
    case "month":
      return `Monthly full resort kWh data (${formatMonthSlash(from)})`;
    case "ytd":
      return `Yearly full resort kWh data (${from.slice(0, 4)})`;
    case "custom": {
      const end = to ?? from;
      return `Range full resort kWh data (${formatDaySlash(from)} - ${formatDaySlash(end)})`;
    }
    default:
      return periodSuffix(timePreset, from, to)
        ? `Full resort kWh data (${periodSuffix(timePreset, from, to)})`
        : "Full resort kWh data";
  }
}

/** Map selection table header: "{zone label} data {period}". */
export function mapSelectionDataColumnLabel(
  zoneLabel: string,
  timePreset: TimePreset,
  from: string,
  to?: string,
): string {
  const suffix = periodSuffix(timePreset, from, to);
  return suffix ? `${zoneLabel} data ${suffix}` : `${zoneLabel} data`;
}
