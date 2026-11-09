/** Master workbooks the dashboard reads (Option B replace-in-place upload). */
export const EXPECTED_MASTER_SHEET_FILES = [
  "HCCP_Gas_Consumption_report.xlsx",
  "HKDL_Daily_Feed-in_Tariff_Report.xlsx",
  "HKDL_Power_Solar_consumption_report.xlsx",
  "HKDL_Top_10.xlsx",
] as const;

export type ExpectedMasterSheetFile =
  (typeof EXPECTED_MASTER_SHEET_FILES)[number];
