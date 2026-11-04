import Papa from "papaparse";

export type RawCsvWarningCode =
  | "CUMULATIVE_DECREASE"
  | "NEGATIVE_DELTA"
  | "LOW_DATA_COUNT";

export interface RawCsvWarning {
  code: RawCsvWarningCode;
  file: string;
  column: string;
  detail?: string;
}

/** EMS export headers name cumulative registers with `#kWh` (exclude kW/kVA). */
export function isCumulativeKwhColumnHeader(header: string): boolean {
  const h = header.trim();
  if (!h || /^timestamp$/i.test(h)) return false;
  return /#kWh/i.test(h);
}

/** Same numeric parsing semantics as master conversion (trim; finite numbers only). */
export function parseRawNumericCell(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return value;
}

function columnDataCount(values: (number | null)[]): number {
  return values.filter((v) => v !== null).length;
}

function firstLastNonEmpty(values: (number | null)[]): {
  first: number;
  last: number;
} | null {
  let first: number | null = null;
  let last: number | null = null;
  for (const v of values) {
    if (v === null) continue;
    if (first === null) first = v;
    last = v;
  }
  if (first === null || last === null) return null;
  return { first, last };
}

export interface ValidateRawCsvOptions {
  /** Display name in warnings (filename or logical id). */
  fileLabel: string;
  /** Flag columns with fewer than this many numeric readings (legacy K / F&lt;70). */
  lowDataCountThreshold?: number;
}

/**
 * Scan one raw meter CSV for non-blocking validation warnings.
 * Does not throw on malformed CSV; returns parse issues only via empty result.
 */
export function validateRawCsvContent(
  csvText: string,
  options: ValidateRawCsvOptions,
): RawCsvWarning[] {
  const { fileLabel, lowDataCountThreshold = 70 } = options;
  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  });

  if (parsed.data.length < 2) {
    return [];
  }

  const headerRow = parsed.data[0];
  const bodyRows = parsed.data.slice(1);
  const colCount = headerRow.length;
  const warnings: RawCsvWarning[] = [];
  const cumulativeFlagged = new Set<string>();

  for (let col = 0; col < colCount; col += 1) {
    const columnHeader = String(headerRow[col] ?? "").trim() || `column_${col + 1}`;
    if (!isCumulativeKwhColumnHeader(columnHeader)) continue;

    const numericByRow: (number | null)[] = bodyRows.map((row) =>
      parseRawNumericCell(row[col]),
    );

    const hasNumeric = numericByRow.some((v) => v !== null);
    if (!hasNumeric) continue;

    for (let r = 0; r < numericByRow.length - 1; r += 1) {
      const current = numericByRow[r];
      const next = numericByRow[r + 1];
      if (current === null || next === null) continue;
      if (current > next) {
        const dedupeKey = `${columnHeader}`;
        if (!cumulativeFlagged.has(dedupeKey)) {
          cumulativeFlagged.add(dedupeKey);
          warnings.push({
            code: "CUMULATIVE_DECREASE",
            file: fileLabel,
            column: columnHeader,
            detail: `row ${r + 2} (${current}) > row ${r + 3} (${next})`,
          });
        }
      }
    }

    const fl = firstLastNonEmpty(numericByRow);
    if (fl && fl.last - fl.first < 0) {
      warnings.push({
        code: "NEGATIVE_DELTA",
        file: fileLabel,
        column: columnHeader,
        detail: `last (${fl.last}) − first (${fl.first}) = ${fl.last - fl.first}`,
      });
    }

    const dataCount = columnDataCount(numericByRow);
    if (dataCount < lowDataCountThreshold) {
      warnings.push({
        code: "LOW_DATA_COUNT",
        file: fileLabel,
        column: columnHeader,
        detail: `dataCount=${dataCount} (threshold ${lowDataCountThreshold})`,
      });
    }
  }

  return warnings;
}

export interface RawCsvInput {
  filename: string;
  content: string;
}

/** Validate many raw CSVs (e.g. full batch); warnings are not deduped across files. */
export function validateRawCsvBatch(inputs: RawCsvInput[]): RawCsvWarning[] {
  return inputs.flatMap(({ filename, content }) =>
    validateRawCsvContent(content, { fileLabel: filename }),
  );
}
