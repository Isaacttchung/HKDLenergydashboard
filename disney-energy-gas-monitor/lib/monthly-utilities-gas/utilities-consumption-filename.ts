/** Park monthly utilities consumption workbook (TGMJ sheet). */
export const MONTHLY_UTILITIES_CONSUMPTION_MARKER =
  "monthly utilities consumption";

export function isMonthlyUtilitiesConsumptionFilename(filename: string): boolean {
  const base = filename.replace(/^.*[/\\]/, "").trim().toLowerCase();
  return (
    base.endsWith(".xlsx") &&
    base.includes(MONTHLY_UTILITIES_CONSUMPTION_MARKER)
  );
}
