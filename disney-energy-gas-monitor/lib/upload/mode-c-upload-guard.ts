import { loadGasolineDieselMonthlyStore } from "@/lib/mobile-fuels/gasoline-diesel-store";
import { parseGasolineDieselWorkbook } from "@/lib/mobile-fuels/parse-gasoline-diesel-workbook";
import type { TgmjColumnDef } from "@/lib/monthly-utilities-gas/tgmj-column-config";
import { parseTgmjWorkbook } from "@/lib/monthly-utilities-gas/parse-tgmj-workbook";
import {
  loadTgmjBundle,
  type TgmjPersistedBundle,
} from "@/lib/monthly-utilities-gas/tgmj-store";
import type {
  ModeCOutdatedWarning,
  ModeCUploadSoftConflict,
} from "@/lib/upload/mode-c-upload-types";

export type { ModeCOutdatedWarning, ModeCUploadSoftConflict };
export { MODE_C_SOFT_WARNING_CODE } from "@/lib/upload/mode-c-upload-types";

export function parseConfirmModeCSoftWarnings(form: FormData): boolean {
  const raw = form.get("confirmModeCSoftWarnings");
  if (raw === null || raw === undefined) return false;
  return String(raw).trim().toLowerCase() === "true";
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function storesEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

function latestMonthKey(store: Record<string, unknown>): string | null {
  const keys = Object.keys(store).filter((k) => /^\d{4}-\d{2}$/.test(k));
  if (keys.length === 0) return null;
  return keys.sort().at(-1) ?? null;
}

function bundleEqual(
  a: TgmjPersistedBundle,
  b: TgmjPersistedBundle,
): boolean {
  return (
    storesEqual(a.store, b.store) &&
    storesEqual(a.columnLayout, b.columnLayout as TgmjColumnDef[])
  );
}

export function buildModeCSoftWarningMessage(
  conflict: Omit<ModeCUploadSoftConflict, "message">,
): string {
  const parts: string[] = [];
  if (conflict.unchangedFileLabels.length > 0) {
    parts.push(
      "The uploaded workbook(s) match what's already on this dashboard — no data would change.",
    );
  }
  if (conflict.outdated.length > 0) {
    parts.push(
      "At least one workbook ends before the latest month already loaded on this dashboard.",
    );
  }
  parts.push("Override anyway, or cancel to keep the current data.");
  return parts.join(" ");
}

export function evaluateMonthlyStoreWarnings(
  incoming: Record<string, unknown>,
  existing: Record<string, unknown>,
  meta: { workbookLabel: string; filename: string },
): {
  unchangedLabel?: string;
  outdated?: ModeCOutdatedWarning;
} {
  const result: {
    unchangedLabel?: string;
    outdated?: ModeCOutdatedWarning;
  } = {};

  if (
    Object.keys(existing).length > 0 &&
    storesEqual(incoming, existing)
  ) {
    result.unchangedLabel = meta.workbookLabel;
  }

  const existingLatest = latestMonthKey(existing);
  const incomingLatest = latestMonthKey(incoming);
  if (existingLatest && incomingLatest && incomingLatest < existingLatest) {
    result.outdated = {
      workbookLabel: meta.workbookLabel,
      filename: meta.filename,
      existingLatestMonth: existingLatest,
      incomingLatestMonth: incomingLatest,
    };
  }

  return result;
}

export async function checkModeCUploadSoftWarnings(options: {
  gasolineBuffer: Buffer | null;
  gasolineFilename: string | null;
  utilitiesBuffer: Buffer | null;
  utilitiesFilename: string | null;
  confirmModeCSoftWarnings: boolean;
}): Promise<ModeCUploadSoftConflict | null> {
  if (options.confirmModeCSoftWarnings) return null;

  const unchangedFileLabels: string[] = [];
  const outdated: ModeCOutdatedWarning[] = [];

  if (options.gasolineBuffer) {
    const label = "Mobile gasoline/diesel workbook";
    const filename = options.gasolineFilename ?? label;
    const incoming = parseGasolineDieselWorkbook(options.gasolineBuffer);
    const existing = await loadGasolineDieselMonthlyStore();
    const flags = evaluateMonthlyStoreWarnings(incoming, existing, {
      workbookLabel: label,
      filename,
    });
    if (flags.unchangedLabel) unchangedFileLabels.push(flags.unchangedLabel);
    if (flags.outdated) outdated.push(flags.outdated);
  }

  if (options.utilitiesBuffer) {
    const label = "Monthly utilities consumption (TGMJ)";
    const filename = options.utilitiesFilename ?? label;
    const incoming = parseTgmjWorkbook(options.utilitiesBuffer);
    const existing = await loadTgmjBundle();

    if (
      Object.keys(existing.store).length > 0 &&
      bundleEqual(incoming, existing)
    ) {
      unchangedFileLabels.push(label);
    }

    const storeFlags = evaluateMonthlyStoreWarnings(incoming.store, existing.store, {
      workbookLabel: label,
      filename,
    });
    if (storeFlags.outdated) outdated.push(storeFlags.outdated);
  }

  if (unchangedFileLabels.length === 0 && outdated.length === 0) {
    return null;
  }

  const body = { unchangedFileLabels, outdated };
  return {
    ...body,
    message: buildModeCSoftWarningMessage(body),
  };
}
