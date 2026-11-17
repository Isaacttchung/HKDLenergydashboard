import {
  parseWorksheetDimension,
} from "@/lib/raw-to-master/excel-column";

function excelColumnIndex(col: string): number {
  let index = 0;
  for (const ch of col.toUpperCase()) {
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index;
}

function parseAutoFilterEnd(ref: string): { endCol: string; endRow: number } | null {
  const m = ref.match(/:?\$?([A-Z]+)\$?(\d+)\s*$/);
  if (!m) return null;
  return { endCol: m[1]!, endRow: Number(m[2]) };
}

/** Grow worksheet autoFilter when row/column span exceeds the written dimension. */
export function patchWorksheetAutoFilter(
  worksheetXml: string,
  dimensionRef: string,
): string {
  const bounds = parseWorksheetDimension(dimensionRef);
  if (!bounds) return worksheetXml;

  const filterMatch = worksheetXml.match(
    /<autoFilter ref="([^"]+)"([^>]*)\/>/,
  );
  if (!filterMatch) return worksheetXml;

  const currentEnd = parseAutoFilterEnd(filterMatch[1]!);
  if (!currentEnd) return worksheetXml;

  const needsGrow =
    excelColumnIndex(currentEnd.endCol) < excelColumnIndex(bounds.endCol) ||
    currentEnd.endRow < bounds.endRow;
  if (!needsGrow) return worksheetXml;

  const newRef = `$${bounds.startCol}$${bounds.startRow}:$${bounds.endCol}$${bounds.endRow}`;
  return worksheetXml.replace(
    /<autoFilter ref="[^"]+"([^>]*)\/>/,
    (_full, tail: string) => `<autoFilter ref="${newRef}"${tail}/>`,
  );
}