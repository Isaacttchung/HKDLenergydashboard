/** Parse OOXML sharedStrings.xml into plain strings (rich text flattened). */
export function parseSharedStringsXml(xml: string): string[] {
  const strings: string[] = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml)) !== null) {
    const block = m[1]!;
    const parts: string[] = [];
    const tRe = /<t(?:[^>]*)>([\s\S]*?)<\/t>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tRe.exec(block)) !== null) {
      parts.push(decodeXmlText(tm[1]!));
    }
    strings.push(parts.length > 0 ? parts.join("") : "");
  }
  return strings;
}

export function buildSharedStringsXml(strings: string[]): string {
  const items = strings
    .map(
      (text) =>
        `<si><t>${encodeXmlText(text)}</t></si>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${items}</sst>`;
}

/** Map each written SST index onto pristine (append missing strings). */
export function mapWrittenSharedStringIndices(
  pristine: string[],
  written: string[],
): number[] {
  const indexMap: number[] = [];
  for (let i = 0; i < written.length; i += 1) {
    const text = written[i]!;
    let at = pristine.indexOf(text);
    if (at < 0) {
      at = pristine.length;
      pristine.push(text);
    }
    indexMap[i] = at;
  }
  return indexMap;
}

/**
 * Rewritten sheetData uses pristine shared string indices instead of ExcelJS's
 * global SST remap (which breaks every other sheet in the workbook).
 */
export function remapSharedStringsInWorksheetXml(
  worksheetXml: string,
  writtenToPristineIndex: number[],
): string {
  return worksheetXml.replace(
    /<c r="([^"]+)"([^>]*)\bt="s"([^>]*)>([\s\S]*?)<\/c>/g,
    (full, ref, before, after, inner) => {
      const vMatch = inner.match(/<v>(\d+)<\/v>/);
      if (!vMatch) return full;
      const writtenIdx = Number(vMatch[1]);
      const mapped = writtenToPristineIndex[writtenIdx];
      if (mapped === undefined) return full;
      return `<c r="${ref}"${before}t="s"${after}><v>${mapped}</v></c>`;
    },
  );
}

function decodeXmlText(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function encodeXmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}