import { format, isValid, parseISO } from "date-fns";

export const MODE_C_SOFT_WARNING_CODE = "MODE_C_SOFT_WARNING";

export interface ModeCOutdatedWarning {
  workbookLabel: string;
  filename: string;
  existingLatestMonth: string;
  incomingLatestMonth: string;
}

export interface ModeCUploadSoftConflict {
  unchangedFileLabels: string[];
  outdated: ModeCOutdatedWarning[];
  message: string;
}

export function formatYearMonthLabel(ym: string): string {
  const date = parseISO(`${ym}-01`);
  if (!isValid(date)) return ym;
  return format(date, "MMMM yyyy");
}
