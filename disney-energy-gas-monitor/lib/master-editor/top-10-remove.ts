import { readFile } from "fs/promises";
import {
  Top10EditorError,
  ensureMappingOverrideCopy,
  persistTop10Edit,
  readTop10Workbook,
} from "@/lib/master-editor/top-10-editor-persist";
import {
  assertRemovableMappingRow,
  assertRemovableSheetRow,
} from "@/lib/master-editor/top-10-protected-rows";
import { deleteSheetRowAt } from "@/lib/master-editor/top-10-sheet-mutate";
import {
  getTop10RawDataRows,
  top10RawDataRowsOverridePath,
  type Top10RawDataRow,
} from "@/lib/raw-to-master/load-top-10-rawdata-rows";
import {
  buildWebSsRowIndex,
  normalizeTop10Location,
  resolveWebSsRow,
  webSsRowKey,
} from "@/lib/raw-to-master/top-10-webss";

export interface Top10RemoveInput {
  meter: string;
  location: string;
}

export interface Top10RemovePreview {
  sheetRow: number;
  removedKey: string;
  rawDataRow: number | null;
  mappingRemoved: boolean;
}

export function planTop10Remove(
  input: Top10RemoveInput,
  mappingRows: Top10RawDataRow[],
  sheetIndex: Map<string, number>,
): Top10RemovePreview {
  const meter = input.meter.trim();
  const location = normalizeTop10Location(input.location);
  assertRemovableSheetRow(meter, location);

  const key = webSsRowKey(meter, location);
  const sheetRow = resolveWebSsRow(sheetIndex, meter, location);
  if (sheetRow === null) {
    throw new Top10EditorError(`No WebSS row for ${meter} @ ${location}`);
  }

  const mapping = mappingRows.find(
    (r) =>
      webSsRowKey(String(r.meter), normalizeTop10Location(r.location)) === key,
  );

  if (mapping) {
    try {
      assertRemovableMappingRow(mapping);
    } catch (e) {
      throw new Top10EditorError(e instanceof Error ? e.message : String(e));
    }
  }

  return {
    sheetRow,
    removedKey: key,
    rawDataRow: mapping?.rawDataRow ?? null,
    mappingRemoved: Boolean(mapping),
  };
}

export async function applyTop10Remove(
  input: Top10RemoveInput,
  options: { dryRun?: boolean } = {},
): Promise<{ preview: Top10RemovePreview; backupDir: string | null }> {
  const { workbook, sheet } = await readTop10Workbook();
  const sheetIndex = buildWebSsRowIndex(sheet);
  const preview = planTop10Remove(input, getTop10RawDataRows(), sheetIndex);

  if (options.dryRun) {
    return { preview, backupDir: null };
  }

  let stored = getTop10RawDataRows();
  if (preview.mappingRemoved) {
    await ensureMappingOverrideCopy();
    const overridePath = top10RawDataRowsOverridePath();
    stored = JSON.parse(await readFile(overridePath, "utf-8")) as Top10RawDataRow[];
    stored = stored.filter(
      (r) =>
        webSsRowKey(String(r.meter), normalizeTop10Location(r.location)) !==
        preview.removedKey,
    );
  }

  deleteSheetRowAt(sheet, preview.sheetRow);
  const backupDir = await persistTop10Edit(workbook, stored);
  return { preview, backupDir };
}
