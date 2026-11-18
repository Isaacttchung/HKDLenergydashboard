/**
 * ExcelJS writeBuffer uses its own styles.xml; swapping only sheetData onto a
 * pristine package mis-attributes numFmt (e.g. 75% occupancy shows as "0-Jan").
 * Copy values/formulas from the written row but keep pristine cell `s` styles.
 */

import {
  excelColumnIndex,
  maxColumnIndexInColsXml,
  previousExcelColumn,
  sortExcelColumns,
} from "@/lib/raw-to-master/excel-column";

const ROW_RE = /<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>/g;
const CELL_RE =
  /<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;

function parseCells(rowInner: string): Map<string, { attrs: string; inner: string }> {
  const map = new Map<string, { attrs: string; inner: string }>();
  let m: RegExpExecArray | null;
  const re = new RegExp(CELL_RE.source, "g");
  while ((m = re.exec(rowInner)) !== null) {
    const col = m[1]!;
    const attrs = m[3] ?? "";
    const inner = m[4] ?? "";
    map.set(col, { attrs, inner });
  }
  return map;
}

function stripStyleAttr(attrs: string): string {
  return attrs.replace(/\s+s="\d+"/, "");
}

function styleAttrFrom(attrs: string): string | null {
  const m = attrs.match(/\s(s="\d+")/);
  return m ? m[1]! : null;
}

function buildCellXml(col: string, rowNum: string, attrs: string, inner: string): string {
  const attrPart = attrs.trim() ? ` ${attrs.trim()}` : "";
  if (!inner) {
    return `<c r="${col}${rowNum}"${attrPart}/>`;
  }
  return `<c r="${col}${rowNum}"${attrPart}>${inner}</c>`;
}

function cellValueSerial(inner: string): number | null {
  const m = inner.match(/<v>(-?\d+(?:\.\d+)?)<\/v>/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** Date headers on WebSS row 1 use Excel serials; data rows use kWh decimals. */
function looksLikeExcelDateSerial(serial: number): boolean {
  return serial >= 40_000 && serial <= 60_000;
}

function styleTemplateAttrs(
  col: string,
  w: { attrs: string; inner: string },
  pCells: Map<string, { attrs: string; inner: string }>,
  wCells: Map<string, { attrs: string; inner: string }>,
  tCells: Map<string, { attrs: string; inner: string }>,
): string | undefined {
  const prevColCell = tCells.get(col);
  const leftCol = previousExcelColumn(col);
  const leftStyle =
    (leftCol ? pCells.get(leftCol)?.attrs : undefined) ??
    (leftCol ? wCells.get(leftCol)?.attrs : undefined);

  const writtenSerial = cellValueSerial(w.inner);
  const prevSerial = prevColCell
    ? cellValueSerial(prevColCell.inner)
    : null;
  if (
    prevColCell &&
    prevSerial !== null &&
    writtenSerial !== null &&
    looksLikeExcelDateSerial(prevSerial) &&
    !looksLikeExcelDateSerial(writtenSerial)
  ) {
    return leftStyle ?? prevColCell.attrs;
  }

  return prevColCell?.attrs ?? leftStyle;
}

/** Append width-only `<col>` definitions for new columns; keep pristine column styles. */
function appendNewColumnWidthsFromWritten(
  pristineWorksheetXml: string,
  writtenWorksheetXml: string,
): string {
  const writtenBlock = writtenWorksheetXml.match(/<cols>([\s\S]*?)<\/cols>/)?.[1];
  const pristineBlock = pristineWorksheetXml.match(
    /<cols>([\s\S]*?)<\/cols>/,
  )?.[1];
  if (!writtenBlock) return pristineWorksheetXml;

  const pristineMax = maxColumnIndexInColsXml(pristineBlock);
  const additions: string[] = [];
  for (const m of writtenBlock.matchAll(/<col ([^/]+)\/>/g)) {
    const attrs = m[1]!;
    const min = colAttrInt(attrs, "min");
    if (min === null || min <= pristineMax) continue;
    const stripped = attrs
      .replace(/\s*style="\d+"/, "")
      .replace(/\s*bestFit="1"/, "");
    additions.push(`<col ${stripped}/>`);
  }
  if (additions.length === 0) return pristineWorksheetXml;

  if (pristineBlock !== undefined) {
    return pristineWorksheetXml.replace(
      /<\/cols>/,
      `${additions.join("")}</cols>`,
    );
  }
  return pristineWorksheetXml.replace(
    /(<sheetFormatPr[^/]*\/>)/,
    `$1<cols>${additions.join("")}</cols>`,
  );
}

function colAttrInt(attrs: string, key: string): number | null {
  const m = attrs.match(new RegExp(`${key}="(\\d+)"`));
  return m ? Number(m[1]) : null;
}

function rowHasCellPayload(inner: string): boolean {
  return (
    /<v>/.test(inner) || /<is>/.test(inner) || /<f\b/.test(inner)
  );
}

/** Excel repair when shared formulas lose `ca="1"` from the pristine sheet. */
function mergeFormulaInnerWithPristine(
  writtenInner: string,
  pristineInner: string | undefined,
): string {
  if (!pristineInner?.includes('ca="1"') || !writtenInner.includes("<f")) {
    return writtenInner;
  }
  if (writtenInner.includes('ca="1"')) return writtenInner;
  return writtenInner.replace(/<f /g, (tag) =>
    tag.includes('ca="1"') ? tag : tag.replace("<f ", '<f ca="1" '),
  );
}

/** Drop cells from `firstUnusedCol` onward (e.g. Park AC+). */
export function dropWorksheetCellsFromColumn(
  worksheetXml: string,
  firstUnusedCol: string,
): string {
  const minIdx = excelColumnIndex(firstUnusedCol);
  return worksheetXml.replace(
    /<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>/g,
    (_row, rowNum, rowAttrs, inner) => {
      const cells: string[] = [];
      let m: RegExpExecArray | null;
      const re = new RegExp(CELL_RE.source, "g");
      while ((m = re.exec(inner)) !== null) {
        const col = m[1]!;
        if (excelColumnIndex(col) >= minIdx) continue;
        const attrs = m[3] ?? "";
        const body = m[4] ?? "";
        cells.push(buildCellXml(col, rowNum, attrs, body));
      }
      return `<row r="${rowNum}"${rowAttrs}>${cells.join("")}</row>`;
    },
  );
}

function mergeCellAttrs(
  writtenAttrs: string,
  pristineAttrs: string | undefined,
  templateAttrs: string | undefined,
): string {
  const style =
    styleAttrFrom(pristineAttrs ?? "") ??
    styleAttrFrom(templateAttrs ?? "") ??
    styleAttrFrom(writtenAttrs) ??
    "";
  const base = stripStyleAttr(writtenAttrs).trim();
  if (!style) return base ? ` ${base}` : "";
  if (!base) return style;
  return `${style} ${base}`;
}

function mergeRowXml(
  rowNum: string,
  rowAttrs: string,
  writtenInner: string,
  pristineInner: string | undefined,
  templateInner: string | undefined,
  preserveColumnValues?: ReadonlySet<string>,
): string {
  const wCells = parseCells(writtenInner);
  const pCells = pristineInner ? parseCells(pristineInner) : new Map();
  const tCells = templateInner ? parseCells(templateInner) : new Map();
  const cols = new Set([...wCells.keys(), ...pCells.keys()]);
  if (cols.size === 0) {
    return `<row r="${rowNum}"${rowAttrs}>${writtenInner}</row>`;
  }

  const parts: string[] = [];
  for (const col of sortExcelColumns(cols)) {
    const w = wCells.get(col);
    if (!w) {
      const keep = pCells.get(col);
      if (keep) {
        parts.push(buildCellXml(col, rowNum, keep.attrs, keep.inner));
      }
      continue;
    }
    const pristineCell = pCells.get(col);
    if (preserveColumnValues?.has(col) && pristineCell) {
      const attrs = mergeCellAttrs(w.attrs, pristineCell.attrs, pristineCell.attrs);
      const inner = rowHasCellPayload(w.inner) ? w.inner : pristineCell.inner;
      parts.push(buildCellXml(col, rowNum, attrs, inner));
      continue;
    }
    const templateStyle = styleTemplateAttrs(col, w, pCells, wCells, tCells);
    const attrs = mergeCellAttrs(w.attrs, pristineCell?.attrs, templateStyle);
    const inner = mergeFormulaInnerWithPristine(
      w.inner,
      pristineCell?.inner,
    );
    parts.push(buildCellXml(col, rowNum, attrs, inner));
  }
  return `<row r="${rowNum}"${rowAttrs}>${parts.join("")}</row>`;
}

function extractRows(
  worksheetXml: string,
): Map<string, { attrs: string; inner: string }> {
  const map = new Map<string, { attrs: string; inner: string }>();
  let m: RegExpExecArray | null;
  const re = new RegExp(ROW_RE.source, "g");
  while ((m = re.exec(worksheetXml)) !== null) {
    map.set(m[1]!, { attrs: m[2] ?? "", inner: m[3]! });
  }
  return map;
}

function maxRowNum(rows: Map<string, { attrs: string; inner: string }>): number {
  let max = 0;
  for (const k of rows.keys()) {
    max = Math.max(max, Number(k));
  }
  return max;
}

/**
 * Replace sheetData with written values while preserving pristine cell styles
 * (and sheet chrome: views, col widths, etc.).
 */
export function mergeWorksheetPreservingCellStyles(
  pristineWorksheetXml: string,
  writtenWorksheetXml: string,
  options?: { preserveColumnValues?: ReadonlySet<string> },
): string {
  const writtenData = writtenWorksheetXml.match(
    /<sheetData[\s\S]*?<\/sheetData>/,
  )?.[0];
  const writtenDim = writtenWorksheetXml.match(
    /<dimension ref="([^"]+)"[^/]*\/>/,
  );
  if (!writtenData) return pristineWorksheetXml;

  const pristineData =
    pristineWorksheetXml.match(/<sheetData[\s\S]*?<\/sheetData>/)?.[0] ?? "";
  const pRows = extractRows(pristineData);
  const wRows = extractRows(writtenData);

  const templateRowNum = String(maxRowNum(pRows) || 1);
  const templateInner = pRows.get(templateRowNum)?.inner;

  const mergedRows: string[] = [];
  const allRowNums = [...new Set([...pRows.keys(), ...wRows.keys()])].sort(
    (a, b) => Number(a) - Number(b),
  );

  for (const rowNum of allRowNums) {
    const w = wRows.get(rowNum);
    const p = pRows.get(rowNum);
    if (!w && p) {
      mergedRows.push(
        `<row r="${rowNum}"${p.attrs}>${p.inner}</row>`,
      );
      continue;
    }
    if (!w) continue;
    if (!p && !rowHasCellPayload(w.inner)) {
      continue;
    }
    const prevTemplate =
      pRows.get(String(Number(rowNum) - 1))?.inner ?? templateInner;
    mergedRows.push(
      mergeRowXml(
        rowNum,
        w.attrs || p?.attrs || "",
        w.inner,
        p?.inner,
        prevTemplate,
        options?.preserveColumnValues,
      ),
    );
  }

  const newSheetData = `<sheetData>${mergedRows.join("")}</sheetData>`;

  let out = pristineWorksheetXml.replace(
    /<sheetData[\s\S]*?<\/sheetData>/,
    newSheetData,
  );
  out = appendNewColumnWidthsFromWritten(out, writtenWorksheetXml);
  if (writtenDim) {
    if (out.includes("<dimension ")) {
      out = out.replace(
        /<dimension ref="([^"]+)"[^/]*\/>/,
        `<dimension ref="${writtenDim[1]!}"/>`,
      );
    } else {
      out = out.replace(
        /(<worksheet[^>]*>)/,
        `$1<dimension ref="${writtenDim[1]!}"/>`,
      );
    }
  }
  return out;
}

/** WebSS_Data opens scrolled to the newest date column; show Meter/Location first. */
export function patchWebSsDataSheetView(worksheetXml: string): string {
  if (!worksheetXml.includes("<sheetViews>")) return worksheetXml;
  let out = worksheetXml.replace(
    /topLeftCell="[^"]+"/g,
    'topLeftCell="C3"',
  );
  out = out.replace(
    /<selection[^/]*pane="topRight"[^/]*\/>/g,
    '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>',
  );
  if (!out.includes('activeCell="A2"')) {
    out = out.replace(
      /(<sheetView[^>]*>)/,
      '$1<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>',
    );
  }
  return out;
}

/** Park opens with a frozen pane on column W; reset to the date/meter block after saves. */
export function patchPowerSolarParkSheetView(worksheetXml: string): string {
  if (!worksheetXml.includes("<sheetViews>")) return worksheetXml;
  let out = worksheetXml.replace(
    /topLeftCell="[^"]+"/g,
    'topLeftCell="B2"',
  );
  out = out.replace(
    /<selection[^/]*pane="topRight"[^/]*\/>/g,
    '<selection pane="bottomRight" activeCell="A2" sqref="A2"/>',
  );
  out = out.replace(
    /activePane="bottomRight"/,
    'activePane="bottomLeft"',
  );
  return out;
}