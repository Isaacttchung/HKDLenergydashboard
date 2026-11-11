import { addIsoDays } from "@/lib/hkdl-daily-report-date";
import {
  mergeHccpGasMidnightMaps,
  parseHccpGasCapacityMidnights,
} from "@/lib/raw-to-master/hccp-gas";
import { loadHccpGasCapacityCsvTextsForConsumption } from "@/lib/upload/hccp-gas-capacity-store";

export const GAS_CAPACITY_PREFLIGHT_CODE = "GAS_CAPACITY_PREFLIGHT";

export function parseSkipGasConversion(form: FormData): boolean {
  const raw = form.get("skipGasConversion");
  if (raw === null || raw === undefined) return false;
  return String(raw).trim().toLowerCase() === "true";
}

export function formatGasCapacityPreflightMessage(missingDates: string[]): string {
  if (missingDates.length === 0) {
    return "Gas needs Capacity data for missing midnight rows.";
  }
  const list =
    missingDates.length === 1
      ? missingDates[0]
      : `${missingDates.slice(0, -1).join(", ")} and ${missingDates.at(-1)}`;
  return `Gas needs Capacity data for ${list}. Upload yesterday's export or a file that includes those midnights.`;
}

export interface GasCapacityPreflightOk {
  ok: true;
}

export interface GasCapacityPreflightFail {
  ok: false;
  consumptionDate: string;
  missingDates: string[];
  message: string;
}

export type GasCapacityPreflightResult =
  | GasCapacityPreflightOk
  | GasCapacityPreflightFail;

export async function preflightHccpGasCapacityForConsumption(
  consumptionDate: string,
  freshUploadCsv: string,
  extraCapacityCsvTexts: string[] = [],
): Promise<GasCapacityPreflightResult> {
  const baseTexts = await loadHccpGasCapacityCsvTextsForConsumption(
    consumptionDate,
    freshUploadCsv,
  );
  const allTexts = [...baseTexts, ...extraCapacityCsvTexts];
  const midnightByDate = mergeHccpGasMidnightMaps(
    allTexts.map((text) => parseHccpGasCapacityMidnights(text)),
  );

  const nextDate = addIsoDays(consumptionDate, 1);
  const missingDates: string[] = [];
  if (!midnightByDate.has(consumptionDate)) {
    missingDates.push(consumptionDate);
  }
  if (!midnightByDate.has(nextDate)) {
    missingDates.push(nextDate);
  }

  if (missingDates.length === 0) {
    return { ok: true };
  }

  return {
    ok: false,
    consumptionDate,
    missingDates,
    message: formatGasCapacityPreflightMessage(missingDates),
  };
}
