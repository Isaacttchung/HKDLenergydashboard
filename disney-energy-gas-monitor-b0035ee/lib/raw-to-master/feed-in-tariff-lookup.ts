import * as XLSX from "xlsx";
import {
  excelSerialToDate,
  parseMetricValue,
} from "@/lib/datastore/parsers/excel-utils";
import { excelColumnLetterToIndex } from "@/lib/raw-to-master/excel-date";

const SHEET_NAME = "Summary_kWh_Data Input";

export class FeedInTariffLookup {
  private readonly sheet: XLSX.WorkSheet;
  private readonly rowByDate = new Map<string, number>();

  constructor(workbook: XLSX.WorkBook) {
    const sheet = workbook.Sheets[SHEET_NAME];
    if (!sheet) {
      throw new Error(
        `Missing sheet "${SHEET_NAME}" in feed-in tariff workbook`,
      );
    }
    this.sheet = sheet;
    this.indexDates();
  }

  static fromBuffer(buffer: Buffer): FeedInTariffLookup {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
    return new FeedInTariffLookup(workbook);
  }

  private indexDates(): void {
    const range = XLSX.utils.decode_range(this.sheet["!ref"] ?? "A1:A1");
    for (let row = range.s.r; row <= range.e.r; row += 1) {
      const addr = XLSX.utils.encode_cell({ r: row, c: 0 });
      const cell = this.sheet[addr];
      if (!cell) continue;
      const iso = excelSerialToDate(cell.v);
      if (iso) this.rowByDate.set(iso, row);
    }
  }

  /** Throws when batch date is missing (blocking per Top_10 feed-in rules). */
  requireDataDate(dataDate: string): void {
    if (!this.rowByDate.has(dataDate)) {
      throw new Error(
        `Feed-in tariff report has no row for data date ${dataDate} on "${SHEET_NAME}"`,
      );
    }
  }

  /** Sum feed-in kWh for one meter (CHHP columns K–R → tariff sheet column letters). */
  sumFeedInForColumns(dataDate: string, columnLetters: string[]): number {
    if (columnLetters.length === 0) return 0;
    const row = this.rowByDate.get(dataDate);
    if (row === undefined) {
      throw new Error(
        `Feed-in tariff report has no row for data date ${dataDate}`,
      );
    }

    let sum = 0;
    for (const letter of columnLetters) {
      const col = excelColumnLetterToIndex(letter);
      const cell = this.sheet[XLSX.utils.encode_cell({ r: row, c: col })];
      const value = parseMetricValue(cell?.v, { treatZeroAsMissing: false });
      if (value !== null) sum += value;
    }
    return sum;
  }
}
