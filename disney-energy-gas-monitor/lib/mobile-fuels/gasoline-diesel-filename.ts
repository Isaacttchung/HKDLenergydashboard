/** Suffix for park mobile gasoline & diesel workbooks (FY blocks). */
export const MOBILE_GASOLINE_DIESEL_UPLOAD_SUFFIX =
  "_Mobile_Gasoline_Diesel_data_sent.xlsx";

export function isMobileGasolineDieselUploadFilename(filename: string): boolean {
  const base = filename.replace(/^.*[/\\]/, "").trim();
  return base.toLowerCase().endsWith(MOBILE_GASOLINE_DIESEL_UPLOAD_SUFFIX.toLowerCase());
}
