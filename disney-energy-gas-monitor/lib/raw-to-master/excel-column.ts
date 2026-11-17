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