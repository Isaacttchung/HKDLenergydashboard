const STORAGE_KEY = "hkdl.master-sheet-upload-token";

export function persistMasterSheetUploadToken(token: string): void {
  const trimmed = token.trim();
  if (!trimmed || typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, trimmed);
}

export function readMasterSheetUploadToken(): string {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(STORAGE_KEY)?.trim() ?? "";
}

export function clearMasterSheetUploadToken(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
