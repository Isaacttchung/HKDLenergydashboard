import * as XLSX from "xlsx";

export type MobileFuelKind = "diesel" | "gasoline";

export interface MobileFuelLocationSeries {
  /** Display label, e.g. Shuttle */
  label: string;
  /** Stable key for aggregation */
  key: string;
}

export interface MobileFuelMonthRecord {
  dieselByLocation: Record<string, number>;
  gasolineByLocation: Record<string, number>;
}

export type MobileFuelMonthlyStore = Record<string, MobileFuelMonthRecord>;

const MONTH_COL_START = 2;
const MONTH_COUNT = 12;

const MONTH_OFFSETS: Array<{ month: number; quarter: 1 | 2 | 3 | 4 }> = [
  { month: 10, quarter: 1 },
  { month: 11, quarter: 1 },
  { month: 12, quarter: 1 },
  { month: 1, quarter: 2 },
  { month: 2, quarter: 2 },
  { month: 3, quarter: 2 },
  { month: 4, quarter: 3 },
  { month: 5, quarter: 3 },
  { month: 6, quarter: 3 },
  { month: 7, quarter: 4 },
  { month: 8, quarter: 4 },
  { month: 9, quarter: 4 },
];

export function normalizeFuelLocationLabel(raw: string): string {
  const withoutParens = raw.replace(/\s*\([^)]*\)/g, "").trim();
  return withoutParens || raw.trim();
}

export function locationKeyFromLabel(label: string): string {
  return normalizeFuelLocationLabel(label)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function parseFuelCell(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const text = String(raw).trim();
  if (!text || text === "-" || /^-\s*$/.test(text)) return null;
  const normalized = text.replace(/,/g, "").replace(/\s/g, "");
  if (!normalized || normalized === "-") return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function fyBlockStartYear(fyLabel: string): number {
  const match = /^FY(\d{2})$/i.exec(fyLabel.trim());
  if (!match) throw new Error(`Unknown FY label: ${fyLabel}`);
  return 2000 + Number.parseInt(match[1]!, 10);
}

function monthIsoForFyColumn(fyYear: number, month: number, quarter: number): string {
  const calendarYear = quarter === 1 ? fyYear - 1 : fyYear;
  const mm = String(month).padStart(2, "0");
  return `${calendarYear}-${mm}`;
}

function ensureMonth(store: MobileFuelMonthlyStore, isoMonth: string): MobileFuelMonthRecord {
  if (!store[isoMonth]) {
    store[isoMonth] = { dieselByLocation: {}, gasolineByLocation: {} };
  }
  return store[isoMonth];
}

function addReading(
  store: MobileFuelMonthlyStore,
  isoMonth: string,
  kind: MobileFuelKind,
  locationKey: string,
  liters: number,
) {
  const bucket = ensureMonth(store, isoMonth);
  const target =
    kind === "diesel" ? bucket.dieselByLocation : bucket.gasolineByLocation;
  target[locationKey] = (target[locationKey] ?? 0) + liters;
}

export function parseGasolineDieselWorkbook(buffer: Buffer): MobileFuelMonthlyStore {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Mobile gasoline/diesel workbook has no sheets");
  }
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets[sheetName]!, {
    header: 1,
    defval: "",
  });

  const store: MobileFuelMonthlyStore = {};

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const colA = String(row[0] ?? "").trim();
    const fyMatch = /^FY(\d{2})$/i.exec(colA);
    if (!fyMatch) continue;

    const fyYear = fyBlockStartYear(colA);
    let currentFuel: MobileFuelKind | null = null;

    for (let i = r + 2; i < rows.length; i++) {
      const dataRow = rows[i] ?? [];
      const a = String(dataRow[0] ?? "").trim();
      const b = String(dataRow[1] ?? "").trim();

      if (/^FY\d{2}$/i.test(a)) break;

      if (!a && !b) continue;

      if (/^LPG/i.test(a)) break;

      if (/quarter total/i.test(b) || /quarter total/i.test(a)) continue;

      if (/^Diesel \(L\)/i.test(a)) {
        currentFuel = "diesel";
      } else if (/^Gasoline \(L\)/i.test(a)) {
        currentFuel = "gasoline";
      }

      if (!currentFuel || !b || /^LPG/i.test(a)) continue;

      const label = normalizeFuelLocationLabel(b);
      const key = locationKeyFromLabel(label);

      for (let c = 0; c < MONTH_COUNT; c++) {
        const colIndex = MONTH_COL_START + c;
        const liters = parseFuelCell(dataRow[colIndex]);
        if (liters === null) continue;
        const { month, quarter } = MONTH_OFFSETS[c]!;
        const isoMonth = monthIsoForFyColumn(fyYear, month, quarter);
        addReading(store, isoMonth, currentFuel, key, liters);
      }
    }
  }

  return store;
}
