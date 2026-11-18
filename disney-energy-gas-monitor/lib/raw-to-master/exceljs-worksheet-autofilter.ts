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

  const endCol = bounds.endCol;
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
 * Power Solar sheets: grow autoFilter rows when dates are added but keep the
 * pristine column span (Park must stay through AC, not ExcelJS column AJ).
 */
export function patchWorksheetAutoFilterGrowRowsOnly(
  pristineWorksheetXml: string,
  worksheetXml: string,
  dimensionRef: string,
): string {
  const filterMatch = worksheetXml.match(
    /<autoFilter ref="([^"]+)"([^>]*)\/>/,
  );
  if (!filterMatch) return worksheetXml;

  const bounds = parseWorksheetDimension(dimensionRef);
  if (!bounds) return worksheetXml;

  const pristineRef = pristineWorksheetXml.match(
    /<autoFilter ref="([^"]+)"([^>]*)\/>/,
  )?.[1];
  const base = parseAutoFilterRange(
    pristineRef ?? filterMatch[1]!,
  );
  if (!base) return worksheetXml;

  const current = parseAutoFilterRange(filterMatch[1]!);
  const endRow = Math.max(base.endRow, bounds.endRow);
  const endCol = base.endCol;
  if (
    current &&
    current.endRow === endRow &&
    current.endCol === endCol &&
    current.startRow === base.startRow &&
    current.startCol === base.startCol
  ) {
    return worksheetXml;
  }

  const newRef = formatAutoFilterRef(
    base.startCol,
    base.startRow,
    endCol,
    endRow,
  );
  return worksheetXml.replace(
    /<autoFilter ref="[^"]+"([^>]*)\/>/,
    (_full, tail: string) => `<autoFilter ref="${newRef}"${tail}/>`,
  );
}

/** FilterDatabase patch input: row grows, column span fixed to pristine autoFilter. */
/**
 * Park data ends at AB; pristine filter through AC paints empty columns and
 * triggers repair when dimension ends at AB.
 */
export function filterDatabaseDimensionGrowRowsOnlyPark(
  pristineWorksheetXml: string,
  dimensionRef: string,
): string {
  const bounds = parseWorksheetDimension(dimensionRef);
  if (!bounds) return dimensionRef;

  const pristineRef = pristineWorksheetXml.match(
    /<autoFilter ref="([^"]+)"([^>]*)\/>/,
  )?.[1];
  const base = pristineRef ? parseAutoFilterRange(pristineRef) : null;
  const startCol = base?.startCol ?? bounds.startCol;
  const startRow = base?.startRow ?? bounds.startRow;
  const endRow = Math.max(base?.endRow ?? bounds.endRow, bounds.endRow);
  return `${startCol}${startRow}:${bounds.endCol}${endRow}`;
}

/** Grow filter named range rows only; keep pristine column end. */
export function filterDatabaseDimensionGrowRowsOnly(
  pristineWorksheetXml: string,
  dimensionRef: string,
): string {
  const bounds = parseWorksheetDimension(dimensionRef);
  if (!bounds) return dimensionRef;

  const pristineRef = pristineWorksheetXml.match(
    /<autoFilter ref="([^"]+)"([^>]*)\/>/,
  )?.[1];
  const base = pristineRef
    ? parseAutoFilterRange(pristineRef)
  : null;
  if (!base) return dimensionRef;

  return `${base.startCol}${base.startRow}:${base.endCol}${Math.max(base.endRow, bounds.endRow)}`;
}

/** WebSS pristine master has no worksheet filter; ExcelJS or prior patches must not leave one on. */
/** Park: filter must not extend past the sheet dimension (AB). */
export function patchPowerSolarParkAutoFilterToDimension(
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

  const endRow = Math.max(current.endRow, bounds.endRow);
  const newRef = formatAutoFilterRef(
    current.startCol,
    current.startRow,
    bounds.endCol,
    endRow,
  );
  if (newRef === filterMatch[1]) return worksheetXml;

  return worksheetXml.replace(
    /<autoFilter ref="[^"]+"([^>]*)\/>/,
    (_full, tail: string) => `<autoFilter ref="${newRef}"${tail}/>`,
  );
}

export function removeWorksheetAutoFilter(worksheetXml: string): string {
  return worksheetXml
    .replace(/\s*<autoFilter[^>]*\/>\s*/g, "\n")
    .replace(/\s*<autoFilter[^>]*>[\s\S]*?<\/autoFilter>\s*/g, "\n");
}

/**
 * @deprecated Adding `<autoFilter>` on WebSS_Data blanked the sheet in Excel; use
 * `_FilterDatabase` extension only (see merge for WebSS_Data).
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