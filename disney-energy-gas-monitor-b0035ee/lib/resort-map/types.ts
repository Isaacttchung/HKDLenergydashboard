export type MapZoneDataSource =
  | { type: "top10"; locations: string[] }
  | { type: "hotel"; metric: "dhh" | "dlh" | "del" | "hccp" | "csb" }
  | { type: "aggregate"; childIds: string[] }
  | { type: "empty"; message: string };

export interface MapZoneDefinition {
  id: string;
  label: string;
  parentId: string | null;
  /** SVG id of the shape hidden when drilled into this zone */
  overlaySvgId?: string;
  /** Elements that receive clicks when this zone's parent is active */
  svgHitIds: string[];
  /** Clicking any zone in the group selects the same filter (shared data) */
  selectionGroup?: string;
  data: MapZoneDataSource;
}

export type MapNavStack = string[];
