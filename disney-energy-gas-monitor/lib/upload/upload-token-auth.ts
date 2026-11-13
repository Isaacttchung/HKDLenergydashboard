import { NextRequest, NextResponse } from "next/server";
import { getUploadTokenFromEnv } from "@/lib/master-sheets-config";

/** True when the host sets `MASTER_SHEET_UPLOAD_TOKEN` (not the UI default). */
export function isMasterSheetUploadTokenRequired(): boolean {
  return Boolean(process.env.MASTER_SHEET_UPLOAD_TOKEN?.trim());
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
  const required = process.env.MASTER_SHEET_UPLOAD_TOKEN?.trim();
  if (!required) return null;

  const expected = getUploadTokenFromEnv();
  const headerToken = request.headers.get("x-upload-token")?.trim();
  const queryToken = request.nextUrl.searchParams.get("uploadToken")?.trim();
  const formToken = options?.formToken?.trim();
  const jsonToken = options?.jsonToken?.trim();

  const ok = [headerToken, queryToken, formToken, jsonToken].some(
    (t) => t === expected,
  );
  return ok ? null : masterSheetUploadTokenUnauthorized();
}
