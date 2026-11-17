import { parseWorksheetDimension } from "@/lib/raw-to-master/excel-column";

function excelColumnIndex(col: string): number {
  let index = 0;
  for (const ch of col.toUpperCase()) {
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index;
}

function parseAutoFilterRange(ref: string): ReturnType<typeof parseWorksheetDimension> {
  return parseWorksheetDimension(ref.replace(/\$/g, ""));
}

function formatAutoFilterRef(
  startCol: string,
  startRow: number,
  endCol: string,
  endRow: number,
): string {
  return `${startCol}${startRow}:${endCol}${endRow}`;
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

  const current = parseAutoFilterRange(filterMatch[1]!);
  if (!current) return worksheetXml;

  const endCol =
    excelColumnIndex(current.endCol) >= excelColumnIndex(bounds.endCol)
      ? current.endCol
      : bounds.endCol;
  const endRow = Math.max(current.endRow, bounds.endRow);
  const needsGrow =
    endCol !== current.endCol || endRow !== current.endRow;
  if (!needsGrow) return worksheetXml;

  const newRef = formatAutoFilterRef(
    current.startCol,
    current.startRow,
    endCol,
    endRow,
  );
  return worksheetXml.replace(
    /<autoFilter ref="[^"]+"([^>]*)\/>/,
    (_full, tail: string) => `<autoFilter ref="${newRef}"${tail}/>`,
  );
}