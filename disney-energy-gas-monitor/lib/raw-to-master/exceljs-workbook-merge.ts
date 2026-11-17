import JSZip from "jszip";
import path from "path";
import {
  buildSharedStringsXml,
  mapWrittenSharedStringIndices,
  parseSharedStringsXml,
  remapSharedStringsInWorksheetXml,
} from "@/lib/raw-to-master/exceljs-shared-strings";
import { patchFilterDatabaseDefinedName } from "@/lib/raw-to-master/exceljs-workbook-defined-names";
import { patchWorksheetAutoFilter } from "@/lib/raw-to-master/exceljs-worksheet-autofilter";
import { mergeWorksheetPreservingCellStyles } from "@/lib/raw-to-master/exceljs-worksheet-style-preserve";

/** On-disk master bytes used as the merge baseline for the current edit session. */
const pristineWorkbookBuffer = new Map<string, Buffer>();

/** Sheet names whose worksheet XML should come from the ExcelJS write. */
const editedSheetNames = new Map<string, Set<string>>();

/** Refreshed on every load so a later partial save cannot revert other sheets. */
export function rememberPristineWorkbook(
  masterWorkbookPath: string,
  buffer: Buffer,
): void {
  const key = path.resolve(masterWorkbookPath);
  pristineWorkbookBuffer.set(key, Buffer.from(buffer));
}

/** @internal test hook */
export function clearPristineWorkbookCacheForTests(): void {
  pristineWorkbookBuffer.clear();
  editedSheetNames.clear();
}

export function markWorkbookSheetEdited(
  masterWorkbookPath: string,
  sheetName: string,
): void {
  const key = path.resolve(masterWorkbookPath);
  const set = editedSheetNames.get(key) ?? new Set<string>();
  set.add(sheetName);
  editedSheetNames.set(key, set);
}

async function sheetNameToWorksheetPath(
  zip: JSZip,
): Promise<Map<string, string>> {
  const wbXml = await zip.file("xl/workbook.xml")?.async("string");
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  if (!wbXml || !relsXml) return new Map();

  const ridToTarget = new Map<string, string>();
  for (const m of relsXml.matchAll(
    /Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^/]*\/>/g,
  )) {
    ridToTarget.set(m[1]!, m[2]!.replace(/^\//, ""));
  }

  const map = new Map<string, string>();
  for (const m of wbXml.matchAll(
    /<sheet[^>]*name="([^"]*)"[^>]*r:id="([^"]+)"/g,
  )) {
    const name = m[1]!.replace(/&amp;/g, "&");
    const target = ridToTarget.get(m[2]!);
    if (!target) continue;
    const sheetFile = target.startsWith("worksheets/")
      ? target
      : `worksheets/${path.basename(target)}`;
    map.set(name, sheetFile);
  }
  return map;
}

/**
 * Keep charts, pivots, SharePoint metadata, and untouched sheets from the
 * pristine workbook. Merge only edited sheetData + extend sharedStrings for
 * that sheet (never replace the global SST table — that blinds other sheets).
 */
export async function mergeWorkbookFromPristine(
  masterWorkbookPath: string,
  writtenBuffer: Buffer,
): Promise<Buffer> {
  const key = path.resolve(masterWorkbookPath);
  const pristine = pristineWorkbookBuffer.get(key);
  if (!pristine) return writtenBuffer;

  const edited = editedSheetNames.get(key);
  if (!edited?.size) return writtenBuffer;

  const out = await JSZip.loadAsync(pristine);
  const written = await JSZip.loadAsync(writtenBuffer);

  const pristineSheets = await sheetNameToWorksheetPath(out);
  const writtenSheets = await sheetNameToWorksheetPath(written);

  const pristineSstXml = (await out.file("xl/sharedStrings.xml")?.async("string")) ?? "";
  const writtenSstXml =
    (await written.file("xl/sharedStrings.xml")?.async("string")) ?? "";
  const pristineStrings = parseSharedStringsXml(pristineSstXml);
  const writtenStrings = parseSharedStringsXml(writtenSstXml);
  const sstIndexMap = mapWrittenSharedStringIndices(
    pristineStrings,
    writtenStrings,
  );

  let workbookXml = (await out.file("xl/workbook.xml")?.async("string")) ?? "";

  for (const sheetName of edited) {
    const wRel = writtenSheets.get(sheetName);
    const oRel = pristineSheets.get(sheetName);
    if (!wRel || !oRel) continue;

    let wXml = await written.file(`xl/${wRel}`)?.async("string");
    const oXml = await out.file(`xl/${oRel}`)?.async("string");
    if (!wXml || !oXml) continue;

    wXml = remapSharedStringsInWorksheetXml(wXml, sstIndexMap);
    const dimensionRef = wXml.match(
      /<dimension ref="([^"]+)"[^/]*\/>/,
    )?.[1];
    let merged = mergeWorksheetPreservingCellStyles(oXml, wXml);
    if (dimensionRef) {
      merged = patchWorksheetAutoFilter(merged, dimensionRef);
    }
    out.file(`xl/${oRel}`, merged);

    const mergedDimension =
      merged.match(/<dimension ref="([^"]+)"[^/]*\/>/)?.[1] ?? dimensionRef;
    if (mergedDimension && workbookXml) {
      workbookXml = patchFilterDatabaseDefinedName(
        workbookXml,
        sheetName,
        mergedDimension,
      );
    }

    const oDir = path.posix.dirname(oRel);
    const wDir = path.posix.dirname(wRel);
    const relsName = `_rels/${path.posix.basename(oRel)}.rels`;
    const wRels = await written
      .file(`xl/${wDir}/${relsName}`)
      ?.async("nodebuffer");
    if (wRels) {
      out.file(`xl/${oDir}/${relsName}`, wRels);
    }
  }

  if (pristineStrings.length > 0 || out.file("xl/sharedStrings.xml")) {
    out.file("xl/sharedStrings.xml", buildSharedStringsXml(pristineStrings));
  }

  // Stale calcChain + new formulas on edited sheets triggers repair; rebuild on open.
  out.remove("xl/calcChain.xml");

  if (workbookXml) {
    out.file("xl/workbook.xml", workbookXml);
  }

  const wbXml = workbookXml || ((await out.file("xl/workbook.xml")?.async("string")) ?? "");
  if (wbXml.includes("<calcPr")) {
    const patched = wbXml.replace(
      /<calcPr([^>]*)\/>/,
      (tag) => {
        if (tag.includes("fullCalcOnLoad")) return tag;
        return tag.replace(/\/>$/, ' fullCalcOnLoad="1"/>');
      },
    );
    if (patched !== wbXml) {
      out.file("xl/workbook.xml", patched);
    }
  } else if (wbXml.includes("</workbook>")) {
    out.file(
      "xl/workbook.xml",
      wbXml.replace(
        "</workbook>",
        '<calcPr calcId="171027" fullCalcOnLoad="1"/></workbook>',
      ),
    );
  }

  editedSheetNames.delete(key);

  return Buffer.from(
    await out.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    }),
  );
}