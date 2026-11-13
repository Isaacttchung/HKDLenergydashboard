import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { TgmjColumnDef } from "@/lib/monthly-utilities-gas/tgmj-column-config";
import { DEFAULT_TGMJ_COLUMN_LAYOUT } from "@/lib/monthly-utilities-gas/tgmj-column-config";
import {
  parseTgmjWorkbook,
  type TgmjMonthlyStore,
} from "@/lib/monthly-utilities-gas/parse-tgmj-workbook";

export const MONTHLY_UTILITIES_DIR = path.join(
  process.cwd(),
  "data",
  "monthly-utilities-gas",
);
export const TGMJ_MONTHLY_JSON = path.join(
  MONTHLY_UTILITIES_DIR,
  "tgmj-monthly.json",
);
export const TGMJ_LAYOUT_JSON = path.join(
  MONTHLY_UTILITIES_DIR,
  "tgmj-column-layout.json",
);

export interface TgmjPersistedBundle {
  store: TgmjMonthlyStore;
  columnLayout: TgmjColumnDef[];
}

let cache: TgmjPersistedBundle | null = null;

export async function saveTgmjWorkbookUpload(
  buffer: Buffer,
): Promise<TgmjPersistedBundle> {
  const { store, columnLayout } = parseTgmjWorkbook(buffer);
  await mkdir(MONTHLY_UTILITIES_DIR, { recursive: true });
  await writeFile(TGMJ_MONTHLY_JSON, JSON.stringify(store, null, 2), "utf-8");
  await writeFile(
    TGMJ_LAYOUT_JSON,
    JSON.stringify(columnLayout, null, 2),
    "utf-8",
  );
  cache = { store, columnLayout };
  return cache;
}

export async function loadTgmjBundle(): Promise<TgmjPersistedBundle> {
  try {
    const storeText = await readFile(TGMJ_MONTHLY_JSON, "utf-8");
    const store = JSON.parse(storeText) as TgmjMonthlyStore;
    let columnLayout: TgmjColumnDef[] = DEFAULT_TGMJ_COLUMN_LAYOUT;
    try {
      const layoutText = await readFile(TGMJ_LAYOUT_JSON, "utf-8");
      columnLayout = JSON.parse(layoutText) as TgmjColumnDef[];
    } catch {
      // layout optional on first deploy
    }
    cache = { store, columnLayout };
    return cache;
  } catch {
    cache = { store: {}, columnLayout: DEFAULT_TGMJ_COLUMN_LAYOUT };
    return cache;
  }
}

export function clearTgmjStoreCache(): void {
  cache = null;
}
