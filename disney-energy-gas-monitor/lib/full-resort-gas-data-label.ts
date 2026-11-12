import { format, parseISO } from "date-fns";
import type { TimePreset } from "@/lib/types";

function formatMonthSlash(fromIsoDate: string): string {
  const monthKey = fromIsoDate.slice(0, 7);
  const [year, month] = monthKey.split("-");
  return `${month}/${year}`;
}

function formatMonthRangeSlash(from: string, to: string): string {
  return `${formatMonthSlash(from)} - ${formatMonthSlash(to)}`;
}

/** Category column title for the monthly utilities gas (MJ) table. */
export function fullResortGasDataColumnLabel(
  timePreset: TimePreset,
  from: string,
  to?: string,
): string {
  switch (timePreset) {
    case "day":
    case "month":
      return `Monthly full resort gas data (${formatMonthSlash(from)})`;
    case "ytd":
      return `Yearly full resort gas data (${from.slice(0, 4)})`;
    case "custom": {
      const end = to ?? from;
      return `Monthly full resort gas data (${formatMonthRangeSlash(from, end)})`;
    }
    default:
      return `Monthly full resort gas data (${format(parseISO(from), "dd/MM/yyyy")})`;
  }
}
