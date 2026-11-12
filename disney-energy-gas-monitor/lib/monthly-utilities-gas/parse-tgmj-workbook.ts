import * as XLSX from "xlsx";
import {
  areaColumnsInDisplayOrder,
  backOfHouseColumns,
  buildTgmjColumnLayout,
  TGMJ_LOCATION_COL,
  type TgmjColumnDef,
} from "@/lib/monthly-utilities-gas/tgmj-column-config";

/** Earliest month we persist (user-facing data starts Jan 2021). */
export const TGMJ_DATA_START_MONTH = "2021-01";

export interface TgmjMonthRecord {
  byKey: Record<string, number>;
}

export type TgmjMonthlyStore = Record<string, TgmjMonthRecord>;

export interface TgmjParseResult {
  store: TgmjMonthlyStore;
  columnLayout: TgmjColumnDef[];
}

function parseMjCell(raw: unknown): number {
  if (raw === null || raw === undefined || raw === "") return 0;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const text = String(raw).trim();
  if (!text || text === "-") return 0;
  const num = Number(text.replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function monthKeyFromCell(cell: unknown): string | null {
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    const y = cell.getUTCFullYear();
    const m = String(cell.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
  return null;
}

export function parseTgmjWorkbook(buffer: Buffer): TgmjParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets.TGMJ ?? workbook.Sheets["TGMJ"];
  if (!sheet) {
    throw new Error('Monthly utilities workbook missing "TGMJ" sheet');
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });

  const headerRow = rows[0];
  if (!headerRow) {
    throw new Error("TGMJ sheet has no header row");
  }

  const columnLayout = buildTgmjColumnLayout(headerRow);
  if (columnLayout.length === 0) {
    throw new Error("TGMJ sheet: no recognized gas columns in row 1");
  }

  const store: TgmjMonthlyStore = {};

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const ym = monthKeyFromCell(row[TGMJ_LOCATION_COL]);
    if (!ym || ym < TGMJ_DATA_START_MONTH) continue;

    const byKey: Record<string, number> = {};
    for (const col of columnLayout) {
      byKey[col.key] = parseMjCell(row[col.colIndex]);
    }
    store[ym] = { byKey };
  }

  return { store, columnLayout };
}

export function aggregateTgmjKeys(
  store: TgmjMonthlyStore,
  months: string[],
  keys: string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of keys) {
    out[key] = 0;
  }
  for (const ym of months) {
    const bucket = store[ym];
    if (!bucket) continue;
    for (const key of keys) {
      out[key] = (out[key] ?? 0) + (bucket.byKey[key] ?? 0);
    }
  }
  return out;
}

export function sumBackOfHouse(
  totalsByKey: Record<string, number>,
  bohCols: TgmjColumnDef[],
): number {
  return bohCols.reduce((sum, col) => sum + (totalsByKey[col.key] ?? 0), 0);
}

export function displayAreaKeys(layout: TgmjColumnDef[]): string[] {
  return areaColumnsInDisplayOrder(layout).map((c) => c.key);
}

export function displayBohKeys(layout: TgmjColumnDef[]): string[] {
  return backOfHouseColumns(layout).map((c) => c.key);
}
