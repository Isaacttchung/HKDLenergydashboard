import JSZip from "jszip";
import path from "path";

/** Pristine package bytes when the workbook was first loaded this process. */
const pristineWorkbookBuffer = new Map<string, Buffer>();

/** Sheet names whose worksheet XML should come from the ExcelJS write. */
const editedSheetNames = new Map<string, Set<string>>();

export function rememberPristineWorkbook(
  masterWorkbookPath: string,
  buffer: Buffer,
): void {
  const key = path.resolve(masterWorkbookPath);
  if (!pristineWorkbookBuffer.has(key)) {
    pristineWorkbookBuffer.set(key, Buffer.from(buffer));
  }
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
 * pristine workbook; take only edited sheets (+ sharedStrings/styles) from ExcelJS.
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

  for (const sheetName of edited) {
    const wRel = writtenSheets.get(sheetName);
    const oRel = pristineSheets.get(sheetName);
    if (!wRel || !oRel) continue;
    const wFile = await written.file(`xl/${wRel}`)?.async("nodebuffer");
    if (wFile) {
      out.file(`xl/${oRel}`, wFile);
    }
  }

  const writtenShared = await written
    .file("xl/sharedStrings.xml")
    ?.async("nodebuffer");
  if (writtenShared) {
    out.file("xl/sharedStrings.xml", writtenShared);
  }
  const writtenStyles = await written.file("xl/styles.xml")?.async("nodebuffer");
  if (writtenStyles) {
    out.file("xl/styles.xml", writtenStyles);
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