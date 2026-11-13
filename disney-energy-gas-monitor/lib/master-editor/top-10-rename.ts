import { readFile } from "fs/promises";
import {
  Top10EditorError,
  ensureMappingOverrideCopy,
  persistTop10Edit,
  readTop10Workbook,
} from "@/lib/master-editor/top-10-editor-persist";
import {
  getTop10RawDataRows,
  top10RawDataRowsOverridePath,
  type Top10RawDataRow,
} from "@/lib/raw-to-master/load-top-10-rawdata-rows";
import { buildWebSsRowIndexExcel } from "@/lib/raw-to-master/top-10-excel";
import {
  normalizeTop10Location,
  resolveWebSsRow,
  webSsRowKey,
} from "@/lib/raw-to-master/top-10-webss";

export interface Top10RenameInput {
  currentMeter: string;
  currentLocation: string;
  newMeter: string;
  newLocation: string;
}

export interface Top10RenamePreview {
  sheetRow: number;
  currentKey: string;
  newKey: string;
  rawDataRow: number;
  mappingUpdates: number;
}

export { Top10EditorError };

function normalizeRenameFields(input: Top10RenameInput): Top10RenameInput {
  return {
    currentMeter: input.currentMeter.trim(),
    currentLocation: normalizeTop10Location(input.currentLocation),
    newMeter: input.newMeter.trim(),
    newLocation: normalizeTop10Location(input.newLocation),
  };
}

export function planTop10Rename(
  input: Top10RenameInput,
  rows: Top10RawDataRow[],
  sheetIndex: Map<string, number>,
): Top10RenamePreview {
  const fields = normalizeRenameFields(input);
  if (!fields.currentMeter || !fields.newMeter) {
    throw new Top10EditorError("Meter id is required");
  }

  const currentKey = webSsRowKey(fields.currentMeter, fields.currentLocation);
  const newKey = webSsRowKey(fields.newMeter, fields.newLocation);

  const sheetRow = resolveWebSsRow(
    sheetIndex,
    fields.currentMeter,
    fields.currentLocation,
  );
  if (sheetRow === null) {
    throw new Top10EditorError(
      `No WebSS row for ${fields.currentMeter} @ ${fields.currentLocation}`,
    );
  }

  const mappingIndex = rows.findIndex(
    (r) =>
      webSsRowKey(String(r.meter), normalizeTop10Location(r.location)) ===
      currentKey,
  );
  if (mappingIndex < 0) {
    throw new Top10EditorError(
      `No mapping entry for ${fields.currentMeter} @ ${fields.currentLocation}`,
    );
  }

  if (currentKey !== newKey) {
    if (sheetIndex.has(newKey)) {
      throw new Top10EditorError(
        `WebSS already has a row for ${fields.newMeter} @ ${fields.newLocation}`,
      );
    }
    const duplicateMapping = rows.some(
      (r, i) =>
        i !== mappingIndex &&
        webSsRowKey(String(r.meter), normalizeTop10Location(r.location)) ===
          newKey,
    );
    if (duplicateMapping) {
      throw new Top10EditorError(
        `Mapping already has ${fields.newMeter} @ ${fields.newLocation}`,
      );
    }
  }

  return {
    sheetRow,
    currentKey,
    newKey,
    rawDataRow: rows[mappingIndex]!.rawDataRow,
    mappingUpdates: currentKey === newKey ? 0 : 1,
  };
}

export async function applyTop10Rename(
  input: Top10RenameInput,
  options: { dryRun?: boolean } = {},
): Promise<{ preview: Top10RenamePreview; backupDir: string | null }> {
  const { workbook, sheet } = await readTop10Workbook();
  const sheetIndex = buildWebSsRowIndexExcel(sheet);
  const rows = [...getTop10RawDataRows()];
  const preview = planTop10Rename(input, rows, sheetIndex);

  if (preview.mappingUpdates === 0 || options.dryRun) {
    return { preview, backupDir: null };
  }

  await ensureMappingOverrideCopy();
  const overridePath = top10RawDataRowsOverridePath();
  const mappingRows = JSON.parse(
    await readFile(overridePath, "utf-8"),
  ) as Top10RawDataRow[];

  const mappingIndex = mappingRows.findIndex(
    (r) =>
      webSsRowKey(String(r.meter), normalizeTop10Location(r.location)) ===
      preview.currentKey,
  );
  if (mappingIndex < 0) {
    throw new Top10EditorError("Mapping row disappeared before apply");
  }

  const fields = normalizeRenameFields(input);
  mappingRows[mappingIndex] = {
    ...mappingRows[mappingIndex]!,
    meter: fields.newMeter,
    location: fields.newLocation,
  };

  const row = sheet.getRow(preview.sheetRow);
  row.getCell(1).value = fields.newMeter;
  row.getCell(2).value = fields.newLocation;

  const backupDir = await persistTop10Edit(workbook, mappingRows);
  return { preview, backupDir };
}
