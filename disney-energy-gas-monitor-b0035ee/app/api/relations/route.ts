import { NextRequest, NextResponse } from "next/server";
import { filterRelations } from "@/lib/relations";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const groupIds = searchParams.get("groups")?.split(",").filter(Boolean) ?? [];
  const buildingIds =
    searchParams.get("buildings")?.split(",").filter(Boolean) ?? [];

  const relations = filterRelations(groupIds, buildingIds);
  return NextResponse.json({ relations });
}
