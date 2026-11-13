import { readFile } from "fs/promises";
import {
  Top10EditorError,
  ensureMappingOverrideCopy,
  persistTop10Edit,
  readTop10Workbook,
} from "@/lib/master-editor/top-10-editor-persist";
import { insertSheetRowAfterExcel } from "@/lib/master-editor/top-10-sheet-mutate-excel";
import {
  getTop10RawDataRows,
  top10RawDataRowsOverridePath,
  type Top10RawDataRow,
} from "@/lib/raw-to-master/load-top-10-rawdata-rows";
import { TOP10_LINK_ID_TO_LOGICAL_ID } from "@/lib/raw-to-master/top-10-link-map";
import { buildWebSsRowIndexExcel } from "@/lib/raw-to-master/top-10-excel";
import {
  normalizeTop10Location,
  resolveWebSsRow,
  webSsRowKey,
} from "@/lib/raw-to-master/top-10-webss";

export interface Top10InsertInput {
  anchorMeter: string;
  anchorLocation: string;
  meter: string;
  location: string;
  kind: "plain" | "solar" | "skip";
  importLink?: number;
  importCol?: string;
  recLink?: number;
  recCol?: string;
  feedInTariffColumns?: string[];
}

export interface Top10InsertPreview {
  anchorSheetRow: number;
  newSheetRow: number;
  newKey: string;
  rawDataRow: number;
  logicalCsv?: string;
}

export function parseTop10InsertMapping(input: Top10InsertInput): Top10RawDataRow {
  const meter = input.meter.trim();
  const location = normalizeTop10Location(input.location);
  if (!meter) throw new Top10EditorError("New meter id is required");
  if (!location && input.kind !== "skip") {
    throw new Top10EditorError("Location is required");
  }

  if (input.kind === "skip") {
    return {
      rawDataRow: 0,
      meter,
      location,
      kind: "skip",
      importRef: null,
      recRef: null,
      feedInTariffColumns: [],
    };
  }

  const link = input.importLink;
  const col = input.importCol?.trim().toUpperCase();
  if (link === undefined || !col) {
    throw new Top10EditorError("importLink and importCol are required for plain/solar");
  }
  if (!(link in TOP10_LINK_ID_TO_LOGICAL_ID)) {
    throw new Top10EditorError(`Unknown Top_10 link id ${link}`);
  }

  let recRef: Top10RawDataRow["recRef"] = null;
  if (input.recLink !== undefined && input.recCol) {
    if (!(input.recLink in TOP10_LINK_ID_TO_LOGICAL_ID)) {
      throw new Top10EditorError(`Unknown rec link id ${input.recLink}`);
    }
    recRef = { link: input.recLink, col: input.recCol.trim().toUpperCase() };
  }

  const feedIn = (input.feedInTariffColumns ?? [])
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  if (input.kind === "solar" && feedIn.length === 0 && !recRef) {
    throw new Top10EditorError("Solar rows need feed-in columns and/or recRef");
  }

  return {
    rawDataRow: 0,
    meter,
    location,
    kind: input.kind,
    importRef: { link, col },
    recRef,
    feedInTariffColumns: feedIn,
  };
}

export function planTop10Insert(
  input: Top10InsertInput,
  mappingRows: Top10RawDataRow[],
  sheetIndex: Map<string, number>,
): Top10InsertPreview {
  const anchorMeter = input.anchorMeter.trim();
  const anchorLocation = normalizeTop10Location(input.anchorLocation);
  const anchorRow = resolveWebSsRow(sheetIndex, anchorMeter, anchorLocation);
  if (anchorRow === null) {
    throw new Top10EditorError(
      `Anchor not found: ${anchorMeter} @ ${anchorLocation}`,
    );
  }

  const draft = parseTop10InsertMapping(input);
  const newKey = webSsRowKey(draft.meter, draft.location);
  if (sheetIndex.has(newKey)) {
    throw new Top10EditorError(`WebSS already has ${newKey}`);
  }
  if (
    mappingRows.some(
      (r) =>
        webSsRowKey(String(r.meter), normalizeTop10Location(r.location)) ===
        newKey,
    )
  ) {
    throw new Top10EditorError(`Mapping already has ${newKey}`);
  }

  const rawDataRow =
    mappingRows.reduce((max, r) => Math.max(max, r.rawDataRow), 0) + 1;
  const logicalCsv =
    draft.importRef?.link !== undefined
      ? TOP10_LINK_ID_TO_LOGICAL_ID[draft.importRef.link]
      : undefined;

  return {
    anchorSheetRow: anchorRow,
    newSheetRow: anchorRow + 1,
    newKey,
    rawDataRow,
    logicalCsv,
  };
}

export async function applyTop10Insert(
  input: Top10InsertInput,
  options: { dryRun?: boolean } = {},
): Promise<{ preview: Top10InsertPreview; backupDir: string | null }> {
  const { workbook, sheet } = await readTop10Workbook();
  const sheetIndex = buildWebSsRowIndexExcel(sheet);
  const preview = planTop10Insert(input, getTop10RawDataRows(), sheetIndex);

  if (options.dryRun) {
    return { preview, backupDir: null };
  }

  await ensureMappingOverrideCopy();
  const overridePath = top10RawDataRowsOverridePath();
  const stored = JSON.parse(
    await readFile(overridePath, "utf-8"),
  ) as Top10RawDataRow[];

  const draft = parseTop10InsertMapping(input);
  draft.rawDataRow = preview.rawDataRow;

  const anchorKey = webSsRowKey(
    input.anchorMeter.trim(),
    normalizeTop10Location(input.anchorLocation),
  );
  let insertAt = stored.length;
  for (let i = 0; i < stored.length; i += 1) {
    const key = webSsRowKey(
      String(stored[i]!.meter),
      normalizeTop10Location(stored[i]!.location),
    );
    if (key === anchorKey) {
      insertAt = i + 1;
      break;
    }
  }
  stored.splice(insertAt, 0, draft);

  const newRow = insertSheetRowAfterExcel(sheet, preview.anchorSheetRow);
  const row = sheet.getRow(newRow);
  row.getCell(1).value = draft.meter;
  row.getCell(2).value = draft.location;

  const backupDir = await persistTop10Edit(workbook, stored);
  return { preview: { ...preview, newSheetRow: newRow }, backupDir };
}
