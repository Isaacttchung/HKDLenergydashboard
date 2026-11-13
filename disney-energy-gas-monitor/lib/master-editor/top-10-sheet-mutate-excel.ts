import type ExcelJS from "exceljs";
import { copyRowPresentationExcel } from "@/lib/raw-to-master/exceljs-preserve";

/**
 * Insert a blank row immediately below `afterRow` (Excel 1-based), shifting
 * lower rows down and cloning row presentation from the anchor row.
 */
export function insertSheetRowAfterExcel(
  sheet: ExcelJS.Worksheet,
  afterRow: number,
): number {
  const newRow = afterRow + 1;
  sheet.spliceRows(newRow, 0, []);
  const templateRow = sheet.getRow(afterRow);
  const targetRow = sheet.getRow(newRow);
  copyRowPresentationExcel(templateRow, targetRow);
  templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (colNumber <= 2) return;
    targetRow.getCell(colNumber).value = null;
  });
  return newRow;
}

/** Remove one row (Excel 1-based) and shift rows below up. */
export function deleteSheetRowAtExcel(
  sheet: ExcelJS.Worksheet,
  rowIndex: number,
): void {
  sheet.spliceRows(rowIndex, 1);
}
