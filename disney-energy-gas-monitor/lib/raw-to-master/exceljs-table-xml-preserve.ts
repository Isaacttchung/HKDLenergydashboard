import JSZip from "jszip";
import path from "path";

const TABLE_DIR = "xl/tables/";

/** In-memory table XML captured at load (keyed by absolute master path). */
const tableXmlByWorkbookPath = new Map<string, Map<string, Buffer>>();

/** Optional table range patches before merge (e.g. extend Gas Meter Reading table). */
const tableRangePatches = new Map<string, Record<string, string>>();

function resolveMasterPath(masterWorkbookPath: string): string {
  return path.resolve(masterWorkbookPath);
}

export async function captureWorkbookTableXml(
  masterWorkbookPath: string,
  xlsxBuffer: Buffer,
): Promise<void> {
  const key = resolveMasterPath(masterWorkbookPath);
  const map = await readTableXmlFromBuffer(xlsxBuffer);
  if (map.size > 0) {
    tableXmlByWorkbookPath.set(key, map);
  }
}

export function queueTableRangePatch(
  masterWorkbookPath: string,
  tableFileName: string,
  rangeRef: string,
): void {
  const key = resolveMasterPath(masterWorkbookPath);
  const entry = tableRangePatches.get(key) ?? {};
  entry[tableFileName] = rangeRef;
  tableRangePatches.set(key, entry);
}

export function patchTableXmlRange(xml: string, rangeRef: string): string {
  return xml.replace(/ref="A1:K\d+"/g, `ref="${rangeRef}"`);
}

async function readTableXmlFromBuffer(
  xlsxBuffer: Buffer,
): Promise<Map<string, Buffer>> {
  const zip = await JSZip.loadAsync(xlsxBuffer);
  const map = new Map<string, Buffer>();
  const tasks: Array<{ name: string; file: JSZip.JSZipObject }> = [];
  zip.forEach((relativePath, file) => {
    if (!relativePath.startsWith(TABLE_DIR) || file.dir) return;
  if (!relativePath.endsWith(".xml")) return;
    tasks.push({
      name: relativePath.slice(TABLE_DIR.length),
      file,
    });
  });
  for (const { name, file } of tasks) {
    map.set(name, await file.async("nodebuffer"));
  }
  return map;
}

/**
 * ExcelJS re-serializes tables with a broken in-memory model (wrong column count).
 * Restore table definitions from the pre-edit workbook so Excel does not repair/wipe sheets.
 */
export async function mergePreservedTableXml(
  writtenBuffer: Buffer,
  originalTables: Map<string, Buffer>,
  rangePatches: Record<string, string>,
): Promise<Buffer> {
  if (originalTables.size === 0) return writtenBuffer;

  const zip = await JSZip.loadAsync(writtenBuffer);
  for (const [fileName, originalBytes] of originalTables) {
    const path = `${TABLE_DIR}${fileName}`;
    let xml = originalBytes.toString("utf8");
    const patchRef = rangePatches[fileName];
    if (patchRef) {
      xml = patchTableXmlRange(xml, patchRef);
    }
    zip.file(path, xml);
  }

  return Buffer.from(
    await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    }),
  );
}

export async function finalizeWorkbookSave(
  masterWorkbookPath: string,
  writtenBuffer: Buffer,
): Promise<Buffer> {
  const key = resolveMasterPath(masterWorkbookPath);
  let originalTables = tableXmlByWorkbookPath.get(key);
  if (!originalTables || originalTables.size === 0) {
    try {
      const { readFile } = await import("fs/promises");
      const onDisk = await readFile(key);
      originalTables = await readTableXmlFromBuffer(onDisk);
    } catch {
      return writtenBuffer;
    }
  }

  const patches = tableRangePatches.get(key) ?? {};
  tableRangePatches.delete(key);

  const merged = await mergePreservedTableXml(
    writtenBuffer,
    originalTables,
    patches,
  );
  tableXmlByWorkbookPath.set(key, await readTableXmlFromBuffer(merged));
  return merged;
}