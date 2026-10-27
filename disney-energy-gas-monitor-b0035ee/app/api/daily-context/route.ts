import { NextRequest, NextResponse } from "next/server";
import { getDailyContext } from "@/lib/daily-context";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date parameter required" }, { status: 400 });
  }

  const context = await getDailyContext(date);
  return NextResponse.json({ date, context });
}
