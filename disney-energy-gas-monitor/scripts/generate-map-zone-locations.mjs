/**
 * One-off helper: validates zone location strings against WebSS_Data column B.
 * Run: node scripts/generate-map-zone-locations.mjs
 */
import XLSX from "xlsx";
import { readFileSync } from "fs";

const wb = XLSX.readFile("data/master-sheets/HKDL_Top_10.xlsx");
const matrix = XLSX.utils.sheet_to_json(wb.Sheets["WebSS_Data"], {
  header: 1,
  defval: "",
});
const allLocations = new Set();
for (let i = 1; i < matrix.length; i += 1) {
  const loc = String(matrix[i][1] ?? "").trim();
  if (loc) allLocations.add(loc);
}

/** @type {Record<string, string[]>} */
export const ZONE_LOCATIONS = {
  "121": [
    "Frozen 121 EMSB",
    "Frozen 121 MSB Frozen Ever After & Tick Tock Toy's & Collectibles",
    "Frozen 121 EMSB2",
    "Frozen 121 Ride - RCCB1",
    "Frozen 121 Ride - RCCB2",
    "Frozen 121 Ride - RCCB3",
    "Frozen 121 Ride - RCCB4",
    "Frozen 121 Ride - MCCB1",
    "Frozen 121 Ride - MCCB2",
    "Frozen 121 Ride - MCCB3",
    "Frozen 121 AHU - MCCB3",
    "Frozen 121 Ride - IMCB2",
    "Frozen 121 LIFT",
    "Frozen 121 MOBILE ROOM",
  ],
  // ... filled in zone-locations.ts (source of truth)
};

const missing = [];
for (const [zone, locs] of Object.entries(ZONE_LOCATIONS)) {
  for (const loc of locs) {
    if (!allLocations.has(loc)) missing.push({ zone, loc });
  }
}
if (missing.length) {
  console.warn("Missing locations:", missing);
} else {
  console.log("All sample locations found.");
}
