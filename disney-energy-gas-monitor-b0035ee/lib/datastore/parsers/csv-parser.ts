import { readFile } from "fs/promises";
import Papa from "papaparse";
import columnMapping from "@/config/column-mapping.json";
import type { ColumnMapping, EnergyRecord, EnergyType } from "@/lib/types";

function parseRow(
  row: Record<string, string>,
  mapping: ColumnMapping,
): EnergyRecord | null {
  const date = row[mapping.date]?.trim();
  const sourceId = row[mapping.source_id]?.trim();
  const energyType = row[mapping.energy_type]?.trim().toLowerCase() as EnergyType;
  const valueRaw = row[mapping.value_kwh]?.trim();
  const costRaw = row[mapping.cost_hkd]?.trim();

  if (!date || !sourceId || !energyType || !valueRaw) return null;
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

export async function parseCsvFile(filePath: string): Promise<EnergyRecord[]> {
  const content = await readFile(filePath, "utf-8");
  const mapping = columnMapping as ColumnMapping;

  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data
    .map((row) => parseRow(row, mapping))
    .filter((row): row is EnergyRecord => row !== null);
}
