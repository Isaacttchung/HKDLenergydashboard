/**
 * ExcelJS writeBuffer uses its own styles.xml; swapping only sheetData onto a
 * pristine package mis-attributes numFmt (e.g. 75% occupancy shows as "0-Jan").
 * Copy values/formulas from the written row but keep pristine cell `s` styles.
 */

import { previousExcelColumn } from "@/lib/raw-to-master/excel-column";

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
): string {
  const wCells = parseCells(writtenInner);
  const pCells = pristineInner ? parseCells(pristineInner) : new Map();
  const tCells = templateInner ? parseCells(templateInner) : new Map();
  const cols = new Set([...wCells.keys(), ...pCells.keys()]);
  if (cols.size === 0) {
    return `<row r="${rowNum}"${rowAttrs}>${writtenInner}</row>`;
  }

  const parts: string[] = [];
  for (const col of [...cols].sort()) {
    const w = wCells.get(col);
    if (!w) {
      const keep = pCells.get(col);
      if (keep) {
        parts.push(buildCellXml(col, rowNum, keep.attrs, keep.inner));
      }
      continue;
    }
    const leftCol = previousExcelColumn(col);
    const leftNeighborStyle =
      (leftCol && pCells.get(leftCol)?.attrs) ??
      (leftCol && wCells.get(leftCol)?.attrs);
    const attrs = mergeCellAttrs(
      w.attrs,
      pCells.get(col)?.attrs,
      leftNeighborStyle ?? tCells.get(col)?.attrs,
    );
    parts.push(buildCellXml(col, rowNum, attrs, w.inner));
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
    const prevTemplate =
      pRows.get(String(Number(rowNum) - 1))?.inner ?? templateInner;
    mergedRows.push(
      mergeRowXml(
        rowNum,
        w.attrs || p?.attrs || "",
        w.inner,
        p?.inner,
        prevTemplate,
      ),
    );
  }

  const newSheetData = `<sheetData>${mergedRows.join("")}</sheetData>`;

  let out = pristineWorksheetXml.replace(
    /<sheetData[\s\S]*?<\/sheetData>/,
    newSheetData,
  );
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