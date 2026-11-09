/** Values entered in the post-upload gas dialog (outdoor temp comes from EMS raw data). */
export interface HccpGasManualFields {
  ballroomUtilization: number;
  dlhOccupancy: number;
  delOccupancy: number;
  dhhOccupancy: number;
  atten: number;
}

export const HCCP_GAS_MANUAL_FIELD_LABELS: Record<
  keyof HccpGasManualFields,
  string
> = {
  ballroomUtilization: "Ballroom utilization",
  dlhOccupancy: "DLH Occupancy",
  delOccupancy: "DEL Occupancy",
  dhhOccupancy: "DHH Occupancy",
  atten: "Atten",
};

/** Matches Gas Meter Reading column G formula. */
export function computeHccpOverallOccupancy(
  dlh: number,
  del: number,
  dhh: number,
): number {
  return (dlh * 400 + del * 750 + dhh * 600) / 1750;
}

export function parseHccpGasManualFields(
  body: unknown,
): HccpGasManualFields | { error: string } {
  if (body === null || typeof body !== "object") {
    return { error: "Invalid body" };
  }
  const record = body as Record<string, unknown>;
  const keys = Object.keys(HCCP_GAS_MANUAL_FIELD_LABELS) as (keyof HccpGasManualFields)[];
  const out = {} as HccpGasManualFields;
  for (const key of keys) {
    const raw = record[key];
    if (raw === undefined || raw === null || raw === "") {
      return { error: `Missing ${HCCP_GAS_MANUAL_FIELD_LABELS[key]}` };
    }
    const value = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (!Number.isFinite(value)) {
      return { error: `Invalid number for ${HCCP_GAS_MANUAL_FIELD_LABELS[key]}` };
    }
    out[key] = value;
  }
  return out;
}
