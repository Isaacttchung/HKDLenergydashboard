import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { MobileFuelMonthlyStore } from "@/lib/mobile-fuels/parse-gasoline-diesel-workbook";
import { parseGasolineDieselWorkbook } from "@/lib/mobile-fuels/parse-gasoline-diesel-workbook";

export const MOBILE_FUELS_DIR = path.join(process.cwd(), "data", "mobile-fuels");
export const MOBILE_GASOLINE_DIESEL_JSON = path.join(
  MOBILE_FUELS_DIR,
  "gasoline-diesel-monthly.json",
);

let cache: MobileFuelMonthlyStore | null = null;

export async function saveGasolineDieselWorkbookUpload(
  buffer: Buffer,
): Promise<MobileFuelMonthlyStore> {
  const store = parseGasolineDieselWorkbook(buffer);
  await mkdir(MOBILE_FUELS_DIR, { recursive: true });
  await writeFile(MOBILE_GASOLINE_DIESEL_JSON, JSON.stringify(store, null, 2), "utf-8");
  cache = store;
  return store;
}

export async function loadGasolineDieselMonthlyStore(): Promise<MobileFuelMonthlyStore> {
  if (cache) return cache;
  try {
    const text = await readFile(MOBILE_GASOLINE_DIESEL_JSON, "utf-8");
    cache = JSON.parse(text) as MobileFuelMonthlyStore;
    return cache;
  } catch {
    cache = {};
    return cache;
  }
}

export function clearGasolineDieselStoreCache(): void {
  cache = null;
}
