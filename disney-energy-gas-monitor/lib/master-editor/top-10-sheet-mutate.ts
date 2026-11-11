import * as XLSX from "xlsx";

/** Shift WebSS_Data rows down and clear the inserted row (cols A/B set by caller). */
export function insertSheetRowAfter(sheet: XLSX.WorkSheet, afterRow: number): number {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const newRow = afterRow + 1;
  for (let r = range.e.r; r > afterRow; r -= 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const from = XLSX.utils.encode_cell({ r, c });
      const to = XLSX.utils.encode_cell({ r: r + 1, c });
      const cell = sheet[from];
      if (cell) {
        sheet[to] = { ...cell };
      } else {
        delete sheet[to];
      }
    }
  }
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    delete sheet[XLSX.utils.encode_cell({ r: newRow, c })];
  }
  range.e.r += 1;
  sheet["!ref"] = XLSX.utils.encode_range(range);
  return newRow;
}

/** Remove a row and shift rows below up (hard delete). */
export function deleteSheetRowAt(sheet: XLSX.WorkSheet, rowIndex: number): void {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  if (rowIndex > range.e.r) return;
  for (let r = rowIndex; r < range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const from = XLSX.utils.encode_cell({ r: r + 1, c });
      const to = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[from];
      if (cell) {
        sheet[to] = { ...cell };
      } else {
        delete sheet[to];
      }
    }
  }
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    delete sheet[XLSX.utils.encode_cell({ r: range.e.r, c })];
  }
  range.e.r = Math.max(range.s.r, range.e.r - 1);
  sheet["!ref"] = XLSX.utils.encode_range(range);
}
