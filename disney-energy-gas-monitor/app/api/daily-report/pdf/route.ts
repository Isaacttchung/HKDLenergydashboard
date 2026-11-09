import { buildDailyReportPayload } from "@/lib/daily-report/build-daily-report-data";
import { renderDailyReportPdf } from "@/lib/daily-report/render-pdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json(
      { error: "Query parameter `date` (yyyy-MM-dd) is required." },
      { status: 400 },
    );
  }

  const payload = await buildDailyReportPayload(date);
  if (!payload) {
    return Response.json(
      { error: "No daily report data available for this date." },
      { status: 404 },
    );
  }

  const pdf = await renderDailyReportPdf(payload);
  const filename = `HKDL-Daily-Report-${date}.pdf`;

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
