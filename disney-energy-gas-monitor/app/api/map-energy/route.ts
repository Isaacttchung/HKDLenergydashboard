import { getDataStore } from "@/lib/datastore/master-sheet-store";
import { computeMapZoneEnergy } from "@/lib/resort-map/aggregate-energy";
import { getMapZone } from "@/lib/resort-map/registry";
import { resolveDateRange } from "@/lib/time-presets";

export const runtime = "nodejs";

function parseZoneIds(searchParams: URLSearchParams): string[] {
  const fromZonesParam = searchParams
    .get("zones")
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (fromZonesParam && fromZonesParam.length > 0) {
    return fromZonesParam.filter((id) => Boolean(getMapZone(id)));
  }

  const repeated = searchParams
    .getAll("zone")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((id) => Boolean(getMapZone(id)));

  if (repeated.length > 0) return repeated;

  const single = searchParams.get("zone")?.trim();
  if (single && getMapZone(single)) return [single];

  return [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zoneIds = parseZoneIds(searchParams);

  if (zoneIds.length === 0) {
    return Response.json({ error: "Unknown map zone." }, { status: 400 });
  }

  const timePreset = (searchParams.get("timePreset") ?? "day") as
    | "day"
    | "month"
    | "ytd"
    | "custom";

  const singleDay =
    searchParams.get("singleDay") ?? searchParams.get("from") ?? undefined;

  const { from, to } = resolveDateRange(
    timePreset,
    searchParams.get("from") ?? undefined,
    searchParams.get("to") ?? undefined,
    singleDay,
    searchParams.get("selectedMonth") ?? undefined,
    searchParams.get("selectedYear") ?? undefined,
  );

  const store = getDataStore();
  const [records, top10, solarIndex] = await Promise.all([
    store.getRecords(),
    store.getTop10Data(),
    store.getSolarInstallationIndex(),
  ]);

  const zones = zoneIds.map((zoneId) =>
    computeMapZoneEnergy(
      zoneId,
      from,
      to,
      top10?.meters,
      records,
      solarIndex,
    ),
  );

  const primary = zones[0];

  return Response.json({
    from,
    to,
    top10MeterCount: top10?.meters.length ?? 0,
    zones,
    /** @deprecated use zones[] */
    ...primary,
  });
}
