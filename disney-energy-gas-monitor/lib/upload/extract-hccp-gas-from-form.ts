import { isHccpGasCapacityCsvFilename } from "@/lib/raw-data-config";

export async function readHccpGasCapacitySupplements(
  form: FormData,
): Promise<string[]> {
  const texts: string[] = [];
  for (const entry of form.getAll("hccpGasCapacitySupplement")) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    texts.push(Buffer.from(await entry.arrayBuffer()).toString("utf-8"));
  }
  return texts;
}

/** Primary HCCP Gas Capacity CSV body from the upload batch (first matching file). */
export async function extractPrimaryHccpGasCapacityCsv(
  files: File[],
): Promise<string | null> {
  for (const file of files) {
    if (!isHccpGasCapacityCsvFilename(file.name)) continue;
    return Buffer.from(await file.arrayBuffer()).toString("utf-8");
  }
  return null;
}
