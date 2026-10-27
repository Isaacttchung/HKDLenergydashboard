import relationsConfig from "@/config/relations.json";
import type { RelationEntry, RelationsConfig } from "@/lib/types";

const config = relationsConfig as RelationsConfig;

export function getAllRelations(): RelationEntry[] {
  return config.relations;
}

export function filterRelations(
  groupIds: string[] = [],
  buildingIds: string[] = [],
): RelationEntry[] {
  const isFullResort = groupIds.length === 0 && buildingIds.length === 0;

  return config.relations.filter((relation) => {
    const { appliesTo } = relation;

    if (isFullResort) return true;

    const matchesGroup = appliesTo.groups.some((g) => groupIds.includes(g));
    const matchesBuilding = appliesTo.buildingIds.some((b) =>
      buildingIds.includes(b),
    );

    if (appliesTo.buildingIds.length === 0 && appliesTo.groups.length > 0) {
      return matchesGroup;
    }

    return matchesGroup || matchesBuilding;
  });
}
