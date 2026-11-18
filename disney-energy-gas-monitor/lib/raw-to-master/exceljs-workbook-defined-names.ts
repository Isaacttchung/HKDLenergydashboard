import {
  excelColumnFromIndex,
  excelColumnIndex,
  parseWorksheetDimension,
} from "@/lib/raw-to-master/excel-column";

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

function parseFilterDatabaseCellRef(rangeBody: string): {
  sheetPrefix: string;
  startCol: string;
  startRow: number;
  endCol: string;
  endRow: number;
} | null {
  const m = rangeBody.match(
    /^([^!]+)!\$([A-Z]+)\$(\d+):\$([A-Z]+)\$(\d+)\s*$/,
  );
  if (!m) return null;
  return {
    sheetPrefix: m[1]!,
    startCol: m[2]!,
    startRow: Number(m[3]),
    endCol: m[4]!,
    endRow: Number(m[5]),
  };
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
  const current = parseFilterDatabaseCellRef(currentBody);
  if (!current) return workbookXml;

  const endColIndex = Math.min(
    Math.max(
      excelColumnIndex(current.endCol),
      excelColumnIndex(bounds.endCol),
    ),
    excelColumnIndex(bounds.endCol),
  );
  const endCol = excelColumnFromIndex(endColIndex);
  const endRow = Math.max(current.endRow, bounds.endRow);
  if (
    endCol === current.endCol &&
    endRow === current.endRow
  ) {
    return workbookXml;
  }

  const quotedSheet =
    current.sheetPrefix.startsWith("'") ? current.sheetPrefix : sheetName;
  const newRange = `${quotedSheet}!$${current.startCol}$${current.startRow}:$${endCol}$${endRow}`;
  return workbookXml.replace(
    filterRe,
    () =>
      `<definedName name="_xlnm._FilterDatabase" localSheetId="${localSheetId}"${filterAttrs}>${newRange}</definedName>`,
  );
}