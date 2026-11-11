import { addIsoDays } from "@/lib/hkdl-daily-report-date";
import { getDataStore } from "@/lib/datastore/master-sheet-store";

export const OUT_OF_ORDER_UPLOAD_MESSAGE =
  "Excel sheets may result out of order if you do not upload in the correct date order.";

export interface OutOfOrderUploadConflict {
  incomingDate: string;
  latestUploadDate: string;
  message: string;
}

export function parseConfirmOutOfOrderUpload(form: FormData): boolean {
  const raw = form.get("confirmOutOfOrder");
  if (raw === null || raw === undefined) return false;
  return String(raw).trim().toLowerCase() === "true";
}

export function buildOutOfOrderUploadMessage(
  latestUploadDate: string,
  incomingDate: string,
): string {
  return (
    `Latest upload date is ${latestUploadDate}; you're uploading ${incomingDate}. ` +
    OUT_OF_ORDER_UPLOAD_MESSAGE +
    " Continue?"
  );
}

/**
 * Soft guard for Mode A (raw conversion) when the batch date is after the latest
 * master/dashboard day by more than one calendar day (e.g. latest Oct 14, uploading
 * Nov 1). The next sequential day (Oct 15) is allowed without prompting. Not used
 * for Mode B master workbook uploads.
 */
export function isSkipAheadOfLatestUpload(
  latestUploadDate: string | null,
  incomingDate: string,
): boolean {
  if (!latestUploadDate || !incomingDate) return false;
  if (incomingDate <= latestUploadDate) return false;
  const nextSequential = addIsoDays(latestUploadDate, 1);
  return incomingDate > nextSequential;
}

export async function checkOutOfOrderUpload(options: {
  incomingDate: string | null;
  replaceExisting: boolean;
  confirmOutOfOrder: boolean;
}): Promise<OutOfOrderUploadConflict | null> {
  const { incomingDate, replaceExisting, confirmOutOfOrder } = options;
  if (!incomingDate || replaceExisting || confirmOutOfOrder) return null;

  const store = getDataStore();
  const latestUploadDate = await store.getLatestDate();
  if (!isSkipAheadOfLatestUpload(latestUploadDate, incomingDate)) return null;

  return {
    incomingDate,
    latestUploadDate: latestUploadDate!,
    message: buildOutOfOrderUploadMessage(latestUploadDate!, incomingDate),
  };
}
