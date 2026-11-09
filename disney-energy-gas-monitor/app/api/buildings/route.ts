import { NextResponse } from "next/server";
import { getBuildings, getGroups, getAllSourceIds } from "@/lib/taxonomy";

export async function GET() {
  return NextResponse.json({
    buildings: getBuildings(),
    groups: getGroups(),
    allSourceIds: getAllSourceIds(),
  });
}
