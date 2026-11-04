import type { RawCsvWarning, RawCsvWarningCode } from "@/lib/raw-csv-validation";

const SECTION_INTRO: Record<RawCsvWarningCode, string> = {
  CUMULATIVE_DECREASE:
    "Some meter columns show cumulative kWh decreasing between readings (not possible for cumulative meters). Review the listed file and column. Calculations completed using first/last non-empty values.",
  NEGATIVE_DELTA:
    "Some columns have a negative daily total (last reading minus first). Review the listed file and column. Calculations still used first/last non-empty values.",
  LOW_DATA_COUNT:
    "Some meter columns have fewer readings than expected (data loss). Review the listed file and column. Calculations still completed.",
};

const CODE_ORDER: RawCsvWarningCode[] = [
  "CUMULATIVE_DECREASE",
  "NEGATIVE_DELTA",
  "LOW_DATA_COUNT",
];

export function groupWarningsByCode(
  warnings: RawCsvWarning[],
): Map<RawCsvWarningCode, RawCsvWarning[]> {
  const map = new Map<RawCsvWarningCode, RawCsvWarning[]>();
  for (const w of warnings) {
    const list = map.get(w.code) ?? [];
    list.push(w);
    map.set(w.code, list);
  }
  return map;
}

export function formatWarningLine(w: RawCsvWarning): string {
  return `${w.file} — column "${w.column}"`;
}

export { SECTION_INTRO, CODE_ORDER };
