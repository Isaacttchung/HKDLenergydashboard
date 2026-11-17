import {
  excelColumnIndex,
  parseWorksheetDimension,
} from "@/lib/raw-to-master/excel-column";

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

/**
 * WebSS_Data relies on `_FilterDatabase` but has no `<autoFilter>` in the
 * pristine master; after the filter range grows, Excel hides column B unless
 * the worksheet filter matches.
 */
export function ensureWorksheetAutoFilter(
  worksheetXml: string,
  dimensionRef: string,
): string {
  if (worksheetXml.includes("<autoFilter ")) {
    return patchWorksheetAutoFilter(worksheetXml, dimensionRef);
  }
  const bounds = parseWorksheetDimension(dimensionRef);
  if (!bounds) return worksheetXml;
  const ref = formatAutoFilterRef(
    bounds.startCol,
    bounds.startRow,
    bounds.endCol,
    bounds.endRow,
  );
  return worksheetXml.replace(
    /(<sheetData)/,
    `<autoFilter ref="${ref}"/>\n$1`,
  );
}