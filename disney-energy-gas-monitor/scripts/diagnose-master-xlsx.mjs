#!/usr/bin/env node
/**
 * Quick OOXML health check after Mode A (run on host):
 *   node scripts/diagnose-master-xlsx.mjs data/master-sheets/HCCP_Gas_Consumption_report.xlsx
 */
import { readFileSync } from "fs";
import { inflateRawSync, inflateSync } from "zlib";
import { basename } from "path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/diagnose-master-xlsx.mjs <path-to.xlsx>");
  process.exit(1);
}

const buf = readFileSync(file);
const entries = new Map();
let offset = 0;
while (offset < buf.length - 4) {
  const sig = buf.readUInt32LE(offset);
  if (sig !== 0x04034b50) break;
  const comp = buf.readUInt16LE(offset + 8);
  const size = buf.readUInt32LE(offset + 18);
  const nameLen = buf.readUInt16LE(offset + 26);
  const extraLen = buf.readUInt16LE(offset + 28);
  const name = buf.toString("utf8", offset + 30, offset + 30 + nameLen);
  const dataStart = offset + 30 + nameLen + extraLen;
  const data = buf.subarray(dataStart, dataStart + size);
  entries.set(name, data);
  offset = dataStart + size;
}

function readText(path) {
  const raw = entries.get(path);
  if (!raw) return null;
  try {
    return (compMethod(raw) ? inflateRawSync(raw) : raw).toString("utf8");
  } catch {
    return null;
  }
}

function compMethod(raw) {
  // local header uses method at archive level — simplified: try inflate
  try {
    inflateRawSync(raw);
    return true;
  } catch {
    return false;
  }
}

console.log(`File: ${basename(file)} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
console.log(`Zip entries: ${entries.size}`);

const wb = readText("xl/workbook.xml");
if (wb) {
  const sheets = [...wb.matchAll(/name="([^"]*)"[^>]*\/>/g)].map((m) => m[1]);
  console.log(`Sheets in workbook.xml: ${sheets.length}`);
}

const gasRel = [...entries.keys()].find((k) => k.includes("sheet") && k.endsWith(".xml"));
let gasV = 0;
for (const [name, raw] of entries) {
  if (name !== "xl/worksheets/sheet3.xml") continue;
  let xml;
  try {
    xml = inflateRawSync(raw).toString("utf8");
  } catch {
    xml = raw.toString("utf8");
  }
  gasV = (xml.match(/<v>/g) || []).length;
}
console.log(`sheet3.xml <v> count (gas template path): ${gasV}`);

const t1 = readText("xl/tables/table1.xml");
if (t1) {
  const cols = t1.match(/tableColumns count="(\d+)"/);
  const ref = t1.match(/\bref="([^"]+)"/);
  console.log(`table1.xml columns=${cols?.[1] ?? "?"} ref=${ref?.[1] ?? "?"}`);
} else {
  console.log("table1.xml: MISSING");
}

console.log(
  "Pivot/charts present:",
  [...entries.keys()].filter((k) => k.includes("pivot") || k.includes("chart")).length,
);