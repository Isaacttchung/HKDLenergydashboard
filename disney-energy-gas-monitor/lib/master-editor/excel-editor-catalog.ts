/** Workbooks/sheets available in the Edit Excels flow (feed-in excluded). */

export type ExcelEditorTarget =
  | { editor: "top10_webss"; workbookId: "top_10"; sheetId: "webss_data" }
  | {
      editor: "coming_soon";
      workbookId: ExcelEditorWorkbookId;
      sheetId: string;
    };

export type ExcelEditorWorkbookId = "top_10" | "power_solar" | "hccp_gas";

export interface ExcelEditorSheetOption {
  id: string;
  label: string;
  editor: ExcelEditorTarget["editor"];
}

export interface ExcelEditorWorkbookOption {
  id: ExcelEditorWorkbookId;
  filename: string;
  label: string;
  sheets: ExcelEditorSheetOption[];
}

export const EXCEL_EDITOR_WORKBOOKS: ExcelEditorWorkbookOption[] = [
  {
    id: "top_10",
    filename: "HKDL_Top_10.xlsx",
    label: "HKDL Top 10",
    sheets: [
      {
        id: "webss_data",
        label: "WebSS_Data",
        editor: "top10_webss",
      },
    ],
  },
  {
    id: "power_solar",
    filename: "HKDL_Power_Solar_consumption_report.xlsx",
    label: "HKDL Power / Solar consumption",
    sheets: [
      { id: "CCP", label: "CCP", editor: "coming_soon" },
      { id: "HCCP", label: "HCCP", editor: "coming_soon" },
      { id: "Hotel", label: "Hotel", editor: "coming_soon" },
      { id: "Park", label: "Park", editor: "coming_soon" },
    ],
  },
  {
    id: "hccp_gas",
    filename: "HCCP_Gas_Consumption_report.xlsx",
    label: "HCCP Gas Consumption",
    sheets: [
      {
        id: "gas_meter_reading",
        label: "Gas Meter Reading",
        editor: "coming_soon",
      },
    ],
  },
];

export function resolveExcelEditorTarget(
  workbookId: ExcelEditorWorkbookId,
  sheetId: string,
): ExcelEditorTarget | null {
  const workbook = EXCEL_EDITOR_WORKBOOKS.find((w) => w.id === workbookId);
  const sheet = workbook?.sheets.find((s) => s.id === sheetId);
  if (!workbook || !sheet) return null;
  if (sheet.editor === "top10_webss" && workbookId === "top_10") {
    return { editor: "top10_webss", workbookId: "top_10", sheetId: "webss_data" };
  }
  return { editor: "coming_soon", workbookId, sheetId };
}
