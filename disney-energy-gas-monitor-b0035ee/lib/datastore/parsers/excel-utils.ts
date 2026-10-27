import * as XLSX from "xlsx";

export const GAS_UNITS_TO_MJ = 48;

export const GAS_UNITS_TO_KWH_FACTOR = GAS_UNITS_TO_MJ * 0.278;

export function gasUnitsToMj(units: number): number {
  return units * GAS_UNITS_TO_MJ;
}

export function normalizeHeader(header: unknown): string {
  return String(header ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function excelSerialToDate(serial: unknown): string | null {
  if (serial === "" || serial === null || serial === undefined) return null;

  if (typeof serial === "string") {
    const trimmed = serial.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber) && asNumber > 30000) {
      return excelSerialToDate(asNumber);
    }
    return null;
  }

  const value = Number(serial);
  if (!Number.isFinite(value) || value < 1) return null;

  const parsed = XLSX.SSF.parse_date_code(value);
  if (!parsed) return null;

  return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
}

export interface ParseMetricValueOptions {
  /** When false, 0 is kept (e.g. rainfall mm, utilization %). Default true for energy meters. */
  treatZeroAsMissing?: boolean;
}

/** Blank cells are missing; zero is missing only when `treatZeroAsMissing` (default true). */
export function parseMetricValue(
  value: unknown,
  options?: ParseMetricValueOptions,
): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const treatZeroAsMissing = options?.treatZeroAsMissing ?? true;
  if (numeric === 0 && treatZeroAsMissing) return null;
  return numeric;
}

export function findColumnKey(
  row: Record<string, unknown>,
  ...candidates: string[]
): string | null {
  const normalizedEntries = Object.keys(row).map((key) => ({
    key,
    normalized: normalizeHeader(key),
  }));

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeader(candidate);
    const match = normalizedEntries.find(
      (entry) => entry.normalized === normalizedCandidate,
    );
    if (match) return match.key;
  }

  return null;
}

export function gasUnitsToKwh(units: number): number {
  return units * GAS_UNITS_TO_KWH_FACTOR;
}

export function gasKwhToUnits(kwh: number): number {
  if (GAS_UNITS_TO_KWH_FACTOR === 0) return 0;
  return kwh / GAS_UNITS_TO_KWH_FACTOR;
}
