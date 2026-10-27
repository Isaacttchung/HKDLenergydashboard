import { format, parseISO } from "date-fns";
import type { TimePreset } from "@/lib/types";

const BASE_LABEL = "Full resort data";

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

/** Table column header: "Full resort data" + period suffix for the active time preset. */
export function fullResortDataColumnLabel(
  timePreset: TimePreset,
  from: string,
  to?: string,
): string {
  const suffix = periodSuffix(timePreset, from, to);
  return suffix ? `${BASE_LABEL} ${suffix}` : BASE_LABEL;
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
