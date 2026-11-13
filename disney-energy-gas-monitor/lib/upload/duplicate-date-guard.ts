import { getDataStore } from "@/lib/datastore/master-sheet-store";
import { hasDailyReportData } from "@/lib/reporting-date";

export const DUPLICATE_DATE_MESSAGE =
  "The data you are uploading is already on the dashboard/mastersheets. Replace or cancel?";

export interface DuplicateDateConflict {
  duplicateDate: string;
  message: string;
}

export function parseReplaceExisting(form: FormData): boolean {
  const raw = form.get("replaceExisting");
  if (raw === null || raw === undefined) return false;
  return String(raw).trim().toLowerCase() === "true";
}

/** Returns conflict when date exists on host and user has not confirmed replace. */
export async function checkDuplicateUploadDate(options: {
  incomingDate: string | null;
  replaceExisting: boolean;
}): Promise<DuplicateDateConflict | null> {
  const { incomingDate, replaceExisting } = options;
  if (!incomingDate || replaceExisting) return null;

  const store = getDataStore();
  const records = await store.getRecords();
  if (!hasDailyReportData(records, incomingDate)) {
    return null;
  }

  return {
    duplicateDate: incomingDate,
    message: DUPLICATE_DATE_MESSAGE,
  };
}
