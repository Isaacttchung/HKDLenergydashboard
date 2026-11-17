import { parseWorksheetDimension } from "@/lib/raw-to-master/excel-column";

/** Workbook sheet order index used by `localSheetId` on defined names. */
export function sheetLocalIdByName(
  workbookXml: string,
  sheetName: string,
): number | null {
  let idx = 0;
  for (const m of workbookXml.matchAll(/<sheet[^>]*name="([^"]*)"/g)) {
    const name = m[1]!.replace(/&amp;/g, "&");
    if (name === sheetName) return idx;
    idx += 1;
  }
  return null;
}

function excelColumnIndex(col: string): number {
  let index = 0;
  for (const ch of col.toUpperCase()) {
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index;
}

function filterDatabaseEnd(rangeBody: string): {
  endCol: string;
  endRow: number;
} | null {
  const m = rangeBody.match(/:?\$([A-Z]+)\$(\d+)\s*$/);
  if (!m) return null;
  return { endCol: m[1]!, endRow: Number(m[2]) };
}

/**
 * Extend hidden `_xlnm._FilterDatabase` when a sheet grows (e.g. new date columns).
 * Stale A:B-only filters on wide WebSS_Data sheets trigger repair and blank column B.
 */
export function patchFilterDatabaseDefinedName(
  workbookXml: string,
  sheetName: string,
  dimensionRef: string,
): string {
  const bounds = parseWorksheetDimension(dimensionRef);
  if (!bounds) return workbookXml;

  const localSheetId = sheetLocalIdByName(workbookXml, sheetName);
  if (localSheetId === null) return workbookXml;

  const filterRe = new RegExp(
    `<definedName name="_xlnm._FilterDatabase" localSheetId="${localSheetId}"([^>]*)>([^<]+)</definedName>`,
  );
  const filterMatch = workbookXml.match(filterRe);
  if (!filterMatch) return workbookXml;

  const filterAttrs = filterMatch[1]!;
  const currentBody = filterMatch[2]!;
  const filterEnd = filterDatabaseEnd(currentBody);
  if (
    filterEnd !== null &&
    excelColumnIndex(filterEnd.endCol) >= excelColumnIndex(bounds.endCol) &&
    filterEnd.endRow >= bounds.endRow
  ) {
    return workbookXml;
  }

  const newRange = `${sheetName}!$${bounds.startCol}$${bounds.startRow}:$${bounds.endCol}$${bounds.endRow}`;
  return workbookXml.replace(
    filterRe,
    () =>
      `<definedName name="_xlnm._FilterDatabase" localSheetId="${localSheetId}"${filterAttrs}>${newRange}</definedName>`,
  );
}