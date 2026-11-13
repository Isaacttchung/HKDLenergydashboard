import ExcelJS from "exceljs";
import { readFile, writeFile } from "fs/promises";

export async function loadExcelWorkbook(
  masterWorkbookPath: string,
): Promise<ExcelJS.Workbook> {
  const buffer = await readFile(masterWorkbookPath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}

export async function saveExcelWorkbook(
  workbook: ExcelJS.Workbook,
  masterWorkbookPath: string,
): Promise<void> {
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  await writeFile(masterWorkbookPath, buffer);
}

/** Copy number format, fill, font, border, alignment (not value). */
export function copyCellPresentation(
  source: ExcelJS.Cell,
  target: ExcelJS.Cell,
): void {
  if (source.style && Object.keys(source.style).length > 0) {
    target.style = JSON.parse(JSON.stringify(source.style));
  }
  if (source.numFmt) {
    target.numFmt = source.numFmt;
  }
}

export function copyColumnPresentation(
  sheet: ExcelJS.Worksheet,
  sourceCol: number,
  targetCol: number,
  fromRow: number,
  toRow: number,
): void {
  for (let row = fromRow; row <= toRow; row += 1) {
    copyCellPresentation(
      sheet.getRow(row).getCell(sourceCol),
      sheet.getRow(row).getCell(targetCol),
    );
  }
}

export function copyRowPresentationExcel(
  source: ExcelJS.Row,
  target: ExcelJS.Row,
): void {
  if (source.height) target.height = source.height;
  source.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    copyCellPresentation(cell, target.getCell(colNumber));
  });
}
