import { getDataStore } from "@/lib/datastore/master-sheet-store";

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
  const contexts = await store.getDailyContexts();
  if (contexts[incomingDate]) {
    return {
      duplicateDate: incomingDate,
      message: DUPLICATE_DATE_MESSAGE,
    };
  }

  const top10 = await store.getTop10Data();
  if (top10?.dates.includes(incomingDate)) {
    return {
      duplicateDate: incomingDate,
      message: DUPLICATE_DATE_MESSAGE,
    };
  }

  return null;
}
