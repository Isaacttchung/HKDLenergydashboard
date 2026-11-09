import type { Top10WorkbookData } from "@/lib/datastore/parsers/hkdl-top10-parser";

export function mergeTop10WorkbookData(
  existing: Top10WorkbookData | null,
  incoming: Top10WorkbookData,
): Top10WorkbookData {
  if (!existing) {
    return {
      dates: [...incoming.dates],
      meters: incoming.meters.map((meter) => ({
        ...meter,
        readingsByDate: { ...meter.readingsByDate },
      })),
    };
  }

  const dateSet = new Set([...existing.dates, ...incoming.dates]);
  const dates = [...dateSet].sort();
  const meterMap = new Map<
    string,
    Top10WorkbookData["meters"][number]
  >();

  for (const meter of [...existing.meters, ...incoming.meters]) {
    const prev = meterMap.get(meter.meterId);
    if (prev) {
      meterMap.set(meter.meterId, {
        meterId: meter.meterId,
        location: meter.location || prev.location,
        readingsByDate: {
          ...prev.readingsByDate,
          ...meter.readingsByDate,
        },
      });
    } else {
      meterMap.set(meter.meterId, {
        ...meter,
        readingsByDate: { ...meter.readingsByDate },
      });
    }
  }

  return {
    dates,
    meters: [...meterMap.values()],
  };
}
