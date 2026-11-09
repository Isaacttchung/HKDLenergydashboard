/** When false, the map is display-only until element ids are remapped to this SVG. */
export const RESORT_MAP_INTERACTIVE = true;

export type ResortMapLevel = "resort" | "hotels" | "theme_park" | "hotel_detail";

export type ResortMapAction =
  | { kind: "group"; id: string }
  | { kind: "building"; id: string }
  | { kind: "drill"; level: ResortMapLevel; focusId: string }
  | { kind: "none" };

/** Non-filter regions: labels / hover only (parking, etc.) */
export const RESORT_MAP_DECORATIONS: {
  elementId: string;
  label: string;
  visibleAt: ResortMapLevel[];
}[] = [
  {
    elementId: "702-Car Park",
    label: "Car park",
    visibleAt: ["resort", "hotels", "theme_park", "hotel_detail"],
  },
  {
    elementId: "701-Coach Park",
    label: "Coach park",
    visibleAt: ["resort", "hotels", "theme_park", "hotel_detail"],
  },
  {
    elementId: "Public Transport Interchange_2",
    label: "Public transport interchange",
    visibleAt: ["resort", "hotels", "theme_park", "hotel_detail"],
  },
];

export interface ResortMapRegion {
  /** SVG element id (path or group id) */
  elementId: string;
  label: string;
  visibleAt: ResortMapLevel[];
  action: ResortMapAction;
  /** When double-clicking, zoom to this level and focus */
  drillTo?: { level: ResortMapLevel; focusId: string };
}

/** Padding around getBBox when zooming */
export const MAP_VIEWBOX = {
  width: 1395,
  height: 1205,
  full: "0 0 1395 1205",
} as const;

export const RESORT_MAP_REGIONS: ResortMapRegion[] = [
  {
    elementId: "Hotels_2",
    label: "Hotels",
    visibleAt: ["resort"],
    action: { kind: "group", id: "all_hotels" },
    drillTo: { level: "hotels", focusId: "Hotels_2" },
  },
  {
    elementId: "Theme Park_2",
    label: "Theme Park",
    visibleAt: ["resort"],
    action: { kind: "group", id: "all_park" },
    drillTo: { level: "theme_park", focusId: "Theme Park_2" },
  },
  {
    elementId: "Back of House_2",
    label: "Back of house (HCCP)",
    visibleAt: ["resort", "hotels"],
    action: { kind: "building", id: "hccp" },
  },
  {
    elementId: "611-Central Chiller Plant",
    label: "Central chiller plant (CCP)",
    visibleAt: ["resort", "theme_park"],
    action: { kind: "building", id: "ccp" },
  },
  {
    elementId: "Disney's Hollywood Hotel",
    label: "Disney's Hollywood Hotel",
    visibleAt: ["resort", "hotels", "hotel_detail"],
    action: { kind: "building", id: "dhh" },
    drillTo: { level: "hotel_detail", focusId: "Disney's Hollywood Hotel" },
  },
  {
    elementId: "DisneyLand Hotel",
    label: "Disneyland Hotel",
    visibleAt: ["resort", "hotels", "hotel_detail"],
    action: { kind: "building", id: "dlh" },
    drillTo: { level: "hotel_detail", focusId: "DisneyLand Hotel" },
  },
  {
    elementId: "Disney Explorers lodge",
    label: "Disney Explorers Lodge",
    visibleAt: ["resort", "hotels", "hotel_detail"],
    action: { kind: "building", id: "del" },
    drillTo: { level: "hotel_detail", focusId: "Disney Explorers lodge" },
  },
  {
    elementId: "Tommorow Land_2",
    label: "Tomorrowland",
    visibleAt: ["resort", "theme_park"],
    action: { kind: "group", id: "all_park" },
    drillTo: { level: "theme_park", focusId: "Tommorow Land_2" },
  },
  {
    elementId: "Fantasy Land_2",
    label: "Fantasyland",
    visibleAt: ["resort", "theme_park"],
    action: { kind: "group", id: "all_park" },
    drillTo: { level: "theme_park", focusId: "Fantasy Land_2" },
  },
  {
    elementId: "Adventure Land_2",
    label: "Adventureland",
    visibleAt: ["resort", "theme_park"],
    action: { kind: "group", id: "all_park" },
    drillTo: { level: "theme_park", focusId: "Adventure Land_2" },
  },
  {
    elementId: "Toy Story Land_2",
    label: "Toy Story Land",
    visibleAt: ["resort", "theme_park"],
    action: { kind: "group", id: "all_park" },
    drillTo: { level: "theme_park", focusId: "Toy Story Land_2" },
  },
  {
    elementId: "Mystic Point_2",
    label: "Mystic Point",
    visibleAt: ["resort", "theme_park"],
    action: { kind: "group", id: "all_park" },
    drillTo: { level: "theme_park", focusId: "Mystic Point_2" },
  },
  {
    elementId: "Grizzly Gulch_2",
    label: "Grizzly Gulch",
    visibleAt: ["resort", "theme_park"],
    action: { kind: "group", id: "all_park" },
    drillTo: { level: "theme_park", focusId: "Grizzly Gulch_2" },
  },
  {
    elementId: "World of Frozen_2",
    label: "World of Frozen",
    visibleAt: ["resort", "theme_park"],
    action: { kind: "group", id: "all_park" },
    drillTo: { level: "theme_park", focusId: "World of Frozen_2" },
  },
  {
    elementId: "Pixar_2",
    label: "Pixar",
    visibleAt: ["resort", "theme_park"],
    action: { kind: "group", id: "all_park" },
    drillTo: { level: "theme_park", focusId: "Pixar_2" },
  },
  {
    elementId: "Main Street_2",
    label: "Main Street",
    visibleAt: ["resort", "theme_park"],
    action: { kind: "group", id: "all_park" },
    drillTo: { level: "theme_park", focusId: "Main Street_2" },
  },
  {
    elementId: "Main Entrance_2",
    label: "Main entrance",
    visibleAt: ["resort", "theme_park"],
    action: { kind: "group", id: "all_park" },
    drillTo: { level: "theme_park", focusId: "Main Entrance_2" },
  },
  {
    elementId: "Park Promenade_2",
    label: "Park promenade",
    visibleAt: ["resort", "theme_park"],
    action: { kind: "group", id: "all_park" },
    drillTo: { level: "theme_park", focusId: "Park Promenade_2" },
  },
];

export function regionForElementId(
  elementId: string,
): ResortMapRegion | undefined {
  return RESORT_MAP_REGIONS.find((r) => r.elementId === elementId);
}

export function isRegionSelected(
  region: ResortMapRegion,
  selectedGroups: string[],
  selectedBuildings: string[],
): boolean {
  if (region.action.kind === "group") {
    return selectedGroups.includes(region.action.id);
  }
  if (region.action.kind === "building") {
    return selectedBuildings.includes(region.action.id);
  }
  return false;
}

export function isDecorationVisibleAt(
  visibleAt: ResortMapLevel[],
  level: ResortMapLevel,
): boolean {
  return visibleAt.includes(level);
}
