import { NextRequest, NextResponse } from "next/server";
import { listCustomGraphCatalog } from "@/lib/custom-graph/catalog";
import { buildCustomGraphChart } from "@/lib/custom-graph/build-chart-data";
import { resolveChartDateRange } from "@/lib/chart-date-range";
import { resolveDateRange } from "@/lib/time-presets";
import type { TimePreset } from "@/lib/types";
import { DATA_MIN_DATE } from "@/lib/time-presets";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  if (searchParams.get("catalog") === "1") {
    return NextResponse.json({ series: listCustomGraphCatalog() });
  }

  const seriesParam = searchParams.get("series");
  const seriesIds = seriesParam?.split(",").filter(Boolean) ?? [];
  if (seriesIds.length === 0) {
    return NextResponse.json(
      { error: "Provide series as comma-separated ids" },
      { status: 400 },
    );
  }

  try {
    const timePreset = (searchParams.get("timePreset") as TimePreset) ?? "day";
    const singleDay =
      searchParams.get("singleDay") ??
      (timePreset === "day" ? searchParams.get("from") : null) ??
      undefined;

    const summaryRange = resolveDateRange(
      timePreset,
      searchParams.get("from") ?? undefined,
      searchParams.get("to") ?? undefined,
      singleDay,
      searchParams.get("selectedMonth") ?? undefined,
      searchParams.get("selectedYear") ?? undefined,
    );

    const chartWindow =
      resolveChartDateRange(
        timePreset,
        summaryRange.from,
        summaryRange.to,
        DATA_MIN_DATE,
      ) ?? summaryRange;

    const chart = await buildCustomGraphChart(
      seriesIds,
      chartWindow.from,
      chartWindow.to,
    );

    return NextResponse.json(chart);
  } catch (error) {
    console.error("Custom graph API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build chart" },
      { status: 500 },
    );
  }
}
