import type { Top10MeterSeries } from "@/lib/datastore/parsers/hkdl-top10-parser";

/** WebSS parent codes for chiller / MCC / PCHD summary rows (not individual buildings). */
const EXCLUDED_SS205_CODES = new Set(
  [
    "SS205A_A3",
    "SS205A_A1",
    "SS205A_B2",
    "SS205A_B1",
    "SS205A_B5",
    "SS205A_C1",
    "SS205A_C3",
    "SS205A_C2",
    "SS205B_A3",
    "SS205B_A1",
    "SS205B_A2",
    "SS205B_B2",
    "SS205B_B1",
    "SS205B_C2",
    "SS205B_C1",
  ].map((code) => code.toUpperCase()),
);

/** Location / meter labels to drop from Top 10 ranking (normalized lowercase). */
const EXCLUDED_LABELS = new Set(
  [
    "Sum CCP1 data",
    "Sum CCP1",
    "CH-1 (SS205A_A3)",
    "611-MCC1 (SS205A_A1)",
    "CH-2 (SS205A_B2)",
    "611-MCC2 (SS205A_B1)",
    "PCHD-4 (SS205A_B5)",
    "CH-6 (SS205A_C1)",
    "CH-7 (SS205A_C3)",
    "PCHD-1 (SS205A_C2)",
    "CH-3 (SS205B_A3)",
    "611-MCC3 (SS205B_A1)",
    "PCHD-2 (SS205B_A2)",
    "CH-4 (SS205B_B2)",
    "611-MCC4 (SS205B_B1)",
    "CH-5 (SS205B_C2)",
    "PCHD-3 (SS205B_C1)",
  ].map(normalizeTop10Label),
);

function normalizeTop10Label(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function containsSumCcp1(value: string): boolean {
  const normalized = normalizeTop10Label(value);
  return /sum\s*ccp\s*1/.test(normalized);
}

function containsExcludedSs205Code(value: string): boolean {
  const upper = value.toUpperCase();
  for (const code of EXCLUDED_SS205_CODES) {
    if (upper.includes(code)) {
      return true;
    }
  }
  return false;
}

export function isExcludedTop10Meter(meter: Top10MeterSeries): boolean {
  const meterId = meter.meterId.trim();
  const location = meter.location.trim();
  const combined = `${meterId} ${location}`.trim();

  if (containsSumCcp1(meterId) || containsSumCcp1(location)) {
    return true;
  }

  if (containsExcludedSs205Code(meterId) || containsExcludedSs205Code(location)) {
    return true;
  }

  if (EXCLUDED_SS205_CODES.has(meterId.toUpperCase())) {
    return true;
  }

  const normalizedLocation = normalizeTop10Label(location);
  const normalizedMeterId = normalizeTop10Label(meterId);

  if (
    EXCLUDED_LABELS.has(normalizedLocation) ||
    EXCLUDED_LABELS.has(normalizedMeterId)
  ) {
    return true;
  }

  if (containsExcludedSs205Code(combined)) {
    return true;
  }

  return false;
}

export function filterTop10EligibleMeters(
  meters: Top10MeterSeries[],
): Top10MeterSeries[] {
  return meters.filter((meter) => !isExcludedTop10Meter(meter));
}
