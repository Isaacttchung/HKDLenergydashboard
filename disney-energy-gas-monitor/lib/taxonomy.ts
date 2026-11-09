import buildingsConfig from "@/config/buildings.json";
import type { Building, BuildingGroup, BuildingTaxonomy } from "@/lib/types";

const taxonomy = buildingsConfig as BuildingTaxonomy;

export function getTaxonomy(): BuildingTaxonomy {
  return taxonomy;
}

export function getAllSourceIds(): string[] {
  return taxonomy.buildings.map((b) => b.id);
}

export function getBuildingById(id: string): Building | undefined {
  return taxonomy.buildings.find((b) => b.id === id);
}

export function resolveSourceIds(
  groupIds: string[] = [],
  buildingIds: string[] = [],
): string[] {
  const ids = new Set<string>();

  for (const groupId of groupIds) {
    const group = taxonomy.groups.find((g) => g.id === groupId);
    if (group) {
      group.buildingIds.forEach((id) => ids.add(id));
    }
  }

  buildingIds.forEach((id) => ids.add(id));

  if (ids.size === 0) {
    return getAllSourceIds();
  }

  return Array.from(ids);
}

export function getScopeLabel(
  groupIds: string[] = [],
  buildingIds: string[] = [],
): string {
  if (groupIds.length === 0 && buildingIds.length === 0) {
    return "Full Resort";
  }

  const labels: string[] = [];

  for (const groupId of groupIds) {
    const group = taxonomy.groups.find((g) => g.id === groupId);
    if (group) labels.push(group.label);
  }

  for (const buildingId of buildingIds) {
    const building = getBuildingById(buildingId);
    if (building) labels.push(building.name);
  }

  return labels.join(" + ") || "Full Resort";
}

/** Header badge from active filters. Empty selection = full property (executive summary scope). */
export function getHeaderScopeLabel(
  groupIds: string[] = [],
  buildingIds: string[] = [],
): string {
  return getScopeLabel(groupIds, buildingIds);
}

export function getGroups(): BuildingGroup[] {
  return taxonomy.groups;
}

export function getBuildings(): Building[] {
  return taxonomy.buildings;
}
