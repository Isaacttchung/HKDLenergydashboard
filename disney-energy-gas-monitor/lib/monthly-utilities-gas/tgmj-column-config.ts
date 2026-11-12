/** TGMJ column indices (0-based). Data columns B–W; column X (Total) is excluded. */
export const TGMJ_LOCATION_COL = 0;
export const TGMJ_LAST_DATA_COL = 22;

export interface TgmjColumnDef {
  key: string;
  label: string;
  colIndex: number;
  kind: "area" | "back_of_house";
}

function normalizeHeaderLabel(raw: string): string {
  return raw.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ");
}

/** Back-of-house building columns aggregated into one row. */
export const BACK_OF_HOUSE_HEADER_MATCHERS: Array<{ match: RegExp; label: string; key: string }> = [
  { match: /^building\s*602$/i, label: "Building 602", key: "building_602" },
  { match: /^building\s*609$/i, label: "Building 609", key: "building_609" },
  { match: /^building\s*604$/i, label: "Building 604", key: "building_604" },
  { match: /^building\s*613a$/i, label: "Building 613A", key: "building_613a" },
  { match: /^building\s*613$/i, label: "Building 613", key: "building_613" },
  { match: /^building\s*610$/i, label: "Building 610", key: "building_610" },
  { match: /^antique vehicles/i, label: "Antique Vehicles", key: "antique_vehicles" },
  { match: /^building\s*645$/i, label: "Building 645", key: "building_645" },
  { match: /^ccp\s*2$/i, label: "CCP2", key: "ccp2" },
  { match: /^costuming services building$/i, label: "Costuming Services Building", key: "costuming_services" },
  { match: /^building\s*413$/i, label: "Building 413", key: "building_413" },
];

export const AREA_HEADER_ORDER: Array<{ match: RegExp; label: string; key: string }> = [
  { match: /^main street$/i, label: "Main Street", key: "main_street" },
  { match: /^tomorrowland$/i, label: "Tomorrowland", key: "tomorrowland" },
  { match: /^fantasyland$/i, label: "Fantasyland", key: "fantasyland" },
  { match: /^adventureland$/i, label: "Adventureland", key: "adventureland" },
  { match: /^disneyland hotel$/i, label: "Disneyland Hotel", key: "disneyland_hotel" },
  { match: /^hollywood hotel$/i, label: "Hollywood Hotel", key: "hollywood_hotel" },
  { match: /^toy story land$/i, label: "Toy Story Land", key: "toy_story_land" },
  { match: /^grizzly gulch$/i, label: "Grizzly Gulch", key: "grizzly_gulch" },
  { match: /^mystic manor$/i, label: "Mystic Manor", key: "mystic_manor" },
  { match: /^disney explorers lodge$/i, label: "Disney Explorers Lodge", key: "disney_explorers_lodge" },
  /** Workbook typo FORZEN; also accept corrected FROZEN header. */
  { match: /^(forzen|frozen)$/i, label: "Frozen", key: "frozen" },
];

export const HOTEL_AREA_KEYS = ["disneyland_hotel", "hollywood_hotel"] as const;

const HOTEL_AREA_ORDER = AREA_HEADER_ORDER.filter((a) =>
  (HOTEL_AREA_KEYS as readonly string[]).includes(a.key),
);

export function buildTgmjColumnLayout(headerRow: unknown[]): TgmjColumnDef[] {
  const defs: TgmjColumnDef[] = [];

  for (let col = 1; col <= TGMJ_LAST_DATA_COL; col++) {
    const header = normalizeHeaderLabel(String(headerRow[col] ?? ""));
    if (!header || /^total$/i.test(header)) continue;

    const boh = BACK_OF_HOUSE_HEADER_MATCHERS.find((m) => m.match.test(header));
    if (boh) {
      defs.push({
        key: boh.key,
        label: boh.label,
        colIndex: col,
        kind: "back_of_house",
      });
      continue;
    }

    const area = AREA_HEADER_ORDER.find((m) => m.match.test(header));
    if (area) {
      defs.push({
        key: area.key,
        label: area.label,
        colIndex: col,
        kind: "area",
      });
    }
  }

  return defs;
}

export function areaColumnsInDisplayOrder(defs: TgmjColumnDef[]): TgmjColumnDef[] {
  const byKey = new Map(defs.filter((d) => d.kind === "area").map((d) => [d.key, d]));
  return AREA_HEADER_ORDER.map((a) => byKey.get(a.key)).filter(
    (d): d is TgmjColumnDef => d != null,
  );
}

/** Park lands only (hotels are grouped separately). */
export function parkAreaColumnsInDisplayOrder(defs: TgmjColumnDef[]): TgmjColumnDef[] {
  return areaColumnsInDisplayOrder(defs).filter(
    (d) => !(HOTEL_AREA_KEYS as readonly string[]).includes(d.key),
  );
}

export function hotelAreaColumnsInDisplayOrder(
  defs: TgmjColumnDef[],
): TgmjColumnDef[] {
  const byKey = new Map(defs.filter((d) => d.kind === "area").map((d) => [d.key, d]));
  return HOTEL_AREA_ORDER.map((a) => byKey.get(a.key)).filter(
    (d): d is TgmjColumnDef => d != null,
  );
}

export function backOfHouseColumns(defs: TgmjColumnDef[]): TgmjColumnDef[] {
  return BACK_OF_HOUSE_HEADER_MATCHERS.map((b) =>
    defs.find((d) => d.key === b.key),
  ).filter((d): d is TgmjColumnDef => d != null);
}

/** Default layout when store has no saved column metadata (matches FY21+ workbook). */
export const DEFAULT_TGMJ_COLUMN_LAYOUT: TgmjColumnDef[] = [
  ...AREA_HEADER_ORDER.map((a) => ({
    key: a.key,
    label: a.label,
    colIndex: -1,
    kind: "area" as const,
  })),
  ...BACK_OF_HOUSE_HEADER_MATCHERS.map((b) => ({
    key: b.key,
    label: b.label,
    colIndex: -1,
    kind: "back_of_house" as const,
  })),
];
