/**
 * ExcelJS writeBuffer uses its own styles.xml; swapping only sheetData onto a
 * pristine package mis-attributes numFmt (e.g. 75% occupancy shows as "0-Jan").
 * Copy values/formulas from the written row but keep pristine cell `s` styles.
 */

import {
  excelColumnIndex,
  maxColumnIndexInColsXml,
  parseWorksheetDimension,
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

const GAS_METER_READING_STYLE_COLUMNS = ["I", "J", "K", "L"] as const;

function replaceCellStyleAttr(attrs: string, style: string): string {
  const trimmed = stripStyleAttr(attrs).trim();
  if (!trimmed) return style;
  return `${style} ${trimmed}`;
}

/**
 * Gas Meter Reading: fix tail rows even when a prior save already committed `s="90"`.
 * Copies the style from the same column on the previous row for I–L.
 */
export function patchGasMeterReadingMeterColumnStyles(
  worksheetXml: string,
): string {
  const dataMatch = worksheetXml.match(
    /<sheetData([\s\S]*?)<\/sheetData>/,
  );
  if (!dataMatch) return worksheetXml;

  const lastStyleByCol = new Map<string, string>();
  const fixedRows: string[] = [];

  let m: RegExpExecArray | null;
  const rowRe = new RegExp(ROW_RE.source, "g");
  while ((m = rowRe.exec(dataMatch[1]!)) !== null) {
    const rowNum = m[1]!;
    const rowAttrs = m[2] ?? "";
    const inner = m[3]!;
    const rowIndex = Number(rowNum);

    const newCells: string[] = [];
    let cellM: RegExpExecArray | null;
    const cellRe = new RegExp(CELL_RE.source, "g");
    while ((cellM = cellRe.exec(inner)) !== null) {
      const col = cellM[1]!;
      let attrs = cellM[3] ?? "";
      const body = cellM[4] ?? "";

      if (
        GAS_METER_READING_STYLE_COLUMNS.includes(
          col as (typeof GAS_METER_READING_STYLE_COLUMNS)[number],
        )
      ) {
        const styleId = styleAttrFrom(attrs)?.match(/s="(\d+)"/)?.[1];
        const prevStyle = lastStyleByCol.get(col);
        if (
          styleId &&
          GAS_METER_BAD_CELL_STYLE_IDS.has(styleId) &&
          prevStyle &&
          rowIndex > 2
        ) {
          attrs = replaceCellStyleAttr(attrs, prevStyle);
        }
        const effective = styleAttrFrom(attrs);
        if (effective) lastStyleByCol.set(col, effective);
      }

      newCells.push(buildCellXml(col, rowNum, attrs, body));
    }
    fixedRows.push(`<row r="${rowNum}"${rowAttrs}>${newCells.join("")}</row>`);
  }

  const newData = `<sheetData>${fixedRows.join("")}</sheetData>`;
  return worksheetXml.replace(/<sheetData[\s\S]*?<\/sheetData>/, newData);
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

/** ExcelJS often assigns thick borders to meter tail cells; never treat as canonical. */
const GAS_METER_BAD_CELL_STYLE_IDS = new Set(["90"]);

function gasMeterStyleAttr(
  pristineAttrs: string | undefined,
  templateAttrs: string | undefined,
): string | null {
  const pristineStyle = styleAttrFrom(pristineAttrs ?? "");
  const pristineId = pristineStyle?.match(/s="(\d+)"/)?.[1];
  const templateStyle = styleAttrFrom(templateAttrs ?? "");
  if (
    pristineStyle &&
    (!pristineId || !GAS_METER_BAD_CELL_STYLE_IDS.has(pristineId))
  ) {
    return pristineStyle;
  }
  return templateStyle ?? pristineStyle;
}

/** Meter tail rows: ExcelJS `s=` often adds thick borders; never keep written styles. */
function mergeCellAttrsFromTemplateOnly(
  writtenAttrs: string,
  pristineAttrs: string | undefined,
  templateAttrs: string | undefined,
): string {
  const style = gasMeterStyleAttr(pristineAttrs, templateAttrs) ?? "";
  const base = stripStyleAttr(writtenAttrs).trim();
  if (!style) return base ? ` ${base}` : "";
  if (!base) return style;
  return `${style} ${base}`;
}

export type MergeWorksheetStyleOptions = {
  preserveColumnValues?: ReadonlySet<string>;
  /** Always use pristine / previous-row style, ignoring ExcelJS `s=`. */
  forceTemplateStyleColumns?: ReadonlySet<string>;
};

function mergeRowXml(
  rowNum: string,
  rowAttrs: string,
  writtenInner: string,
  pristineInner: string | undefined,
  templateInner: string | undefined,
  options?: MergeWorksheetStyleOptions,
): string {
  const preserveColumnValues = options?.preserveColumnValues;
  const forceTemplateStyleColumns = options?.forceTemplateStyleColumns;
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
    const attrs = forceTemplateStyleColumns?.has(col)
      ? mergeCellAttrsFromTemplateOnly(
          w.attrs,
          pristineCell?.attrs,
          templateStyle,
        )
      : mergeCellAttrs(w.attrs, pristineCell?.attrs, templateStyle);
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
function columnIndexCovered(colsInner: string, index: number): boolean {
  for (const m of colsInner.matchAll(/<col ([^/]+)\/>/g)) {
    const attrs = m[1]!;
    const min = colAttrInt(attrs, "min");
    const max = colAttrInt(attrs, "max") ?? min;
    if (min === null) continue;
    if (min <= index && (max ?? min) >= index) return true;
  }
  return false;
}

function columnWidthForIndex(
  colsInner: string,
  index: number,
): number | null {
  for (const m of colsInner.matchAll(/<col ([^/]+)\/>/g)) {
    const attrs = m[1]!;
    const min = colAttrInt(attrs, "min");
    const max = colAttrInt(attrs, "max") ?? min;
    if (min === null) continue;
    if (min <= index && (max ?? min) >= index) {
      const w = attrs.match(/width="([^"]+)"/);
      if (w) return Number(w[1]);
    }
  }
  return null;
}

/** New WebSS date headers need an explicit width or Excel shows `########`. */
export function ensureTrailingDateColumnWidth(
  worksheetXml: string,
  fallbackWidth = 11.85546875,
): string {
  const dimRef = worksheetXml.match(
    /<dimension ref="([^"]+)"[^/]*\/>/,
  )?.[1];
  if (!dimRef) return worksheetXml;
  const bounds = parseWorksheetDimension(dimRef);
  if (!bounds) return worksheetXml;
  const endIdx = excelColumnIndex(bounds.endCol);
  const colsMatch = worksheetXml.match(/<cols>([\s\S]*?)<\/cols>/);
  if (!colsMatch) return worksheetXml;
  const inner = colsMatch[1]!;
  if (columnIndexCovered(inner, endIdx)) return worksheetXml;
  const prevWidth =
    columnWidthForIndex(inner, endIdx - 1) ?? fallbackWidth;
  const entry = `<col min="${endIdx}" max="${endIdx}" width="${prevWidth}" customWidth="1"/>`;
  return worksheetXml.replace(/<\/cols>/, `${entry}</cols>`);
}

export function mergeWorksheetPreservingCellStyles(
  pristineWorksheetXml: string,
  writtenWorksheetXml: string,
  options?: MergeWorksheetStyleOptions,
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
        options,
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

/**
 * Park AA/AB are labels; AC+ are unused. ExcelJS leaves wide styled `<col>` stubs
 * (green fill / grid borders) — trim to AB and drop column style on AA/AB.
 */
export function patchPowerSolarParkColumnChrome(worksheetXml: string): string {
  const acIdx = excelColumnIndex("AC");
  const aaIdx = excelColumnIndex("AA");
  if (!worksheetXml.includes("<cols>")) return worksheetXml;
  return worksheetXml.replace(
    /<cols>([\s\S]*?)<\/cols>/,
    (_full, inner: string) => {
      const kept: string[] = [];
      for (const m of inner.matchAll(/<col ([^/]+)\/>/g)) {
        let attrs = m[1]!;
        const min = colAttrInt(attrs, "min");
        if (min === null || min >= acIdx) continue;
        if (min >= aaIdx) {
          attrs = attrs.replace(/\s*style="\d+"/g, "");
        }
        kept.push(`<col ${attrs}/>`);
      }
      return `<cols>${kept.join("")}</cols>`;
    },
  );
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