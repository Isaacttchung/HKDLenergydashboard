import { NextRequest, NextResponse } from "next/server";
import { getUploadTokenFromEnv } from "@/lib/master-sheets-config";

/** True when `MASTER_SHEET_UPLOAD_TOKEN` is set on the host. */
export function isMasterSheetUploadTokenRequired(): boolean {
  return Boolean(getUploadTokenFromEnv());
}

export function masterSheetUploadTokenUnauthorized(): NextResponse {
  return NextResponse.json({ error: "Invalid upload token" }, { status: 401 });
}

/**
 * Validates the same credentials as master sheet upload:
 * - Header `x-upload-token`
 * - Query `uploadToken`
 * - Optional form field or JSON `uploadToken` (editor POST)
 */
export function checkMasterSheetUploadToken(
  request: NextRequest,
  options?: { formToken?: string | null; jsonToken?: string | null },
): NextResponse | null {
  const required = getUploadTokenFromEnv();
  if (!required) return null;

  const headerToken = request.headers.get("x-upload-token")?.trim();
  const queryToken = request.nextUrl.searchParams.get("uploadToken")?.trim();
  const formToken = options?.formToken?.trim();
  const jsonToken = options?.jsonToken?.trim();

  const ok = [headerToken, queryToken, formToken, jsonToken].some(
    (t) => t === required,
  );
  return ok ? null : masterSheetUploadTokenUnauthorized();
}
