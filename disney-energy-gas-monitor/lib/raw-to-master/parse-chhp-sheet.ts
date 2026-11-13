import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";
import type {
  MercuryRawLogicalId,
  PowerSolarArea,
  PowerSolarMeterMapping,
} from "@/lib/raw-to-master/power-solar-mappings";

const CHHP_SHEET = "CHHP";

/** Formula-DailyWeb4 external link index on CHHP rows (not Top_10 RawData link ids). */
const CHHP_LINK_TO_MERCURY: Record<number, MercuryRawLogicalId> = {
  1: "Mercury_CCP",
  3: "Mercury_HCCP",
  4: "Mercury_Hotel",
  5: "Mercury_Park",
};

export interface ParsedChhpRow {
  area: PowerSolarArea;
  chhpMeterId: string;
  rawLogicalId: MercuryRawLogicalId;
  rawColumnLetter: string;
  feedInTariffColumns: string[];
}

function colLetterFromMercuryFormula(formula: string | undefined): string | null {
  if (!formula) return null;
  const match = formula.match(/Mercury_\w+!([A-Z]+):/);
  return match ? match[1] : null;
}

function linkIndexFromMercuryFormula(formula: string | undefined): number | null {
  if (!formula) return null;
  const match = formula.match(/\[(\d+)\]/);
  return match ? Number(match[1]) : null;
}

function parseFeedInList(cell: unknown): string[] {
  return String(cell ?? "")
    .split(/[,，]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isAreaBannerRow(row: unknown[]): PowerSolarArea | null {
  const label = String(row[0] ?? "").trim();
  if (label === "1st") return null;
  if (
    (label === "CCP" ||
      label === "HCCP" ||
      label === "Hotel" ||
      label === "Park") &&
    String(row[1]).trim() === "1st"
  ) {
    return label;
  }
  return null;
}

/**
 * Parse Formula-DailyWeb4 **CHHP** sheet: Mercury column + feed-in tariff letters.
 * Master column headers are not on CHHP; merge with existing mappings when refreshing.
 */
export function parseChhpSheet(workbook: WorkBook): ParsedChhpRow[] {
  const sheet = workbook.Sheets[CHHP_SHEET];
  if (!sheet) {
    throw new Error(`Formula workbook missing sheet "${CHHP_SHEET}"`);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];

  let area: PowerSolarArea | null = null;
  const parsed: ParsedChhpRow[] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const banner = isAreaBannerRow(row);
    if (banner) {
      area = banner;
      continue;
    }
    if (!area) continue;

    const chhpMeterId = String(row[0] ?? "").trim();
    if (!chhpMeterId || chhpMeterId === "1st") continue;

    const firstCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: 1 })];
    const formula = typeof firstCell?.f === "string" ? firstCell.f : undefined;
    if (!formula) continue;

    const link = linkIndexFromMercuryFormula(formula);
    const rawLogicalId = link ? CHHP_LINK_TO_MERCURY[link] : undefined;
    const rawColumnLetter = colLetterFromMercuryFormula(formula);
    if (!rawLogicalId || !rawColumnLetter) continue;

    parsed.push({
      area,
      chhpMeterId,
      rawLogicalId,
      rawColumnLetter,
      feedInTariffColumns: parseFeedInList(row[9]),
    });
  }

  return parsed;
}

export function chhpRowKey(row: ParsedChhpRow | PowerSolarMeterMapping): string {
  return `${row.area}|${row.rawLogicalId}|${row.rawColumnLetter}|${row.chhpMeterId}`;
}
