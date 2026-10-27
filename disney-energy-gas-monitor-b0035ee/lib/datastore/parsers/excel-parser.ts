import { readFile } from "fs/promises";
import * as XLSX from "xlsx";
import columnMapping from "@/config/column-mapping.json";
import type { ColumnMapping, EnergyRecord, EnergyType } from "@/lib/types";

function parseRow(
  row: Record<string, unknown>,
  mapping: ColumnMapping,
): EnergyRecord | null {
  const date = String(row[mapping.date] ?? "").trim();
  const sourceId = String(row[mapping.source_id] ?? "").trim();
  const energyType = String(row[mapping.energy_type] ?? "")
    .trim()
    .toLowerCase() as EnergyType;
  const valueRaw = row[mapping.value_kwh];
  const costRaw = row[mapping.cost_hkd];

  if (!date || !sourceId || !energyType || valueRaw === undefined) return null;
  if (!["electricity", "gas", "solar"].includes(energyType)) return null;

  const valueKwh = Number(valueRaw);
  if (Number.isNaN(valueKwh)) return null;

  const costHkd =
    costRaw === undefined || costRaw === ""
      ? null
      : Number.isNaN(Number(costRaw))
        ? null
        : Number(costRaw);

  return {
    date,
    sourceId,
    energyType,
    valueKwh,
    costHkd,
  };
}

export async function parseExcelFile(filePath: string): Promise<EnergyRecord[]> {
  const buffer = await readFile(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  const mapping = columnMapping as ColumnMapping;

  return rows
    .map((row) => parseRow(row, mapping))
    .filter((row): row is EnergyRecord => row !== null);
}
