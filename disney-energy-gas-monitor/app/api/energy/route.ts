import { NextRequest, NextResponse } from "next/server";
import { getEnergyData } from "@/lib/energy-service";
import type { CompareType, MetricView, TimePreset } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const groupIds = searchParams.get("groups")?.split(",").filter(Boolean) ?? [];
    const buildingIds =
      searchParams.get("buildings")?.split(",").filter(Boolean) ?? [];
    const sourceIds = searchParams.get("sources")?.split(",").filter(Boolean);

    const data = await getEnergyData({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      singleDay: searchParams.get("singleDay") ?? undefined,
      selectedMonth: searchParams.get("selectedMonth") ?? undefined,
      selectedYear: searchParams.get("selectedYear") ?? undefined,
      metric: (searchParams.get("metric") as MetricView) ?? "compare",
      timePreset: (searchParams.get("timePreset") as TimePreset) ?? "ytd",
      compare: searchParams.get("compare") === "true",
      compareType: (searchParams.get("compareType") as CompareType) ?? "year",
      compareFrom: searchParams.get("compareFrom") ?? undefined,
      compareTo: searchParams.get("compareTo") ?? undefined,
      groupIds,
      buildingIds,
      sourceIds: sourceIds?.length ? sourceIds : undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Energy API error:", error);
    return NextResponse.json(
      { error: "Failed to load energy data" },
      { status: 500 },
    );
  }
}
