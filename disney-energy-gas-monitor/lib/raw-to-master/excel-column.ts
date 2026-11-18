/** 1-based column index: `A` → 1, `Z` → 26, `AA` → 27. */
export function excelColumnIndex(col: string): number {
  let index = 0;
  for (const ch of col.toUpperCase()) {
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index;
}

/** 1-based index → `A`, `AB`, … */
export function excelColumnFromIndex(index: number): string {
  let n = index;
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

/** Sort Excel column letters in sheet column order (not ASCII: `AA` after `Z`). */
export function sortExcelColumns(cols: Iterable<string>): string[] {
  return [...cols].sort(
    (a, b) => excelColumnIndex(a) - excelColumnIndex(b),
  );
}

/** `B` → `A`, `A` → null, `CCO` → `CCN`. */
export function previousExcelColumn(col: string): string | null {
  let index = 0;
  for (const ch of col.toUpperCase()) {
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  if (index <= 1) return null;
  index -= 1;
  let result = "";
  while (index > 0) {
    const rem = (index - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    index = Math.floor((index - 1) / 26);
  }
  return result;
}

function colAttrInt(attrs: string, key: string): number | null {
  const m = attrs.match(new RegExp(`${key}="(\\d+)"`));
  return m ? Number(m[1]) : null;
}

/** Highest 1-based column index declared in a worksheet `<cols>` block. */
export function maxColumnIndexInColsXml(colsXml: string | undefined): number {
  if (!colsXml) return 0;
  let max = 0;
  for (const m of colsXml.matchAll(/<col ([^/]+)\/>/g)) {
    const attrs = m[1]!;
    const hi = colAttrInt(attrs, "max") ?? colAttrInt(attrs, "min");
    if (hi !== null) max = Math.max(max, hi);
  }
  return max;
}

/** `A1:CCO301` or `A1` → bounds; missing end uses start. */
export function parseWorksheetDimension(ref: string): {
  startCol: string;
  startRow: number;
  endCol: string;
  endRow: number;
} | null {
  const m = ref.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
  if (!m) return null;
  const startCol = m[1]!;
  const startRow = Number(m[2]);
  const endCol = m[3] ?? startCol;
  const endRow = m[4] !== undefined ? Number(m[4]) : startRow;
  return { startCol, startRow, endCol, endRow };
}