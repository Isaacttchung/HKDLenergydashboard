import {
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import type { TimePreset } from "@/lib/types";
import { clampIsoDate, DATA_MIN_DATE } from "@/lib/time-presets";

/** Date window for trend charts (summary panels keep the selected period). */
export function resolveChartDateRange(
  timePreset: TimePreset,
  summaryFrom: string,
  summaryTo: string,
  dataMinDate: string = DATA_MIN_DATE,
): { from: string; to: string } | null {
  switch (timePreset) {
    case "day": {
      const end = summaryTo;
      const start = format(subDays(parseISO(end), 29), "yyyy-MM-dd");
      return {
        from: clampIsoDate(start, dataMinDate, end),
        to: end,
      };
    }
    case "month": {
      const anchor = startOfMonth(parseISO(`${summaryFrom.slice(0, 7)}-01`));
      const chartEnd = endOfMonth(anchor);
      const chartStart = startOfMonth(subMonths(anchor, 11));
      return {
        from: clampIsoDate(
          format(chartStart, "yyyy-MM-dd"),
          dataMinDate,
          format(chartEnd, "yyyy-MM-dd"),
        ),
        to: format(chartEnd, "yyyy-MM-dd"),
      };
    }
    case "ytd": {
      const endYear = summaryTo.slice(0, 4);
      const minYear = dataMinDate.slice(0, 4);
      return {
        from: `${minYear}-01-01`,
        to: clampIsoDate(`${endYear}-12-31`, dataMinDate, summaryTo),
      };
    }
    case "custom":
    default:
      return null;
  }
}
