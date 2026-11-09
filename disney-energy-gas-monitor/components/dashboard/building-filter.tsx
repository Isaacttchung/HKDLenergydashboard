"use client";

import { ResortMap } from "@/components/dashboard/resort-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Building, BuildingGroup } from "@/lib/types";
import { X } from "lucide-react";

interface BuildingFilterProps {
  groups: BuildingGroup[];
  buildings: Building[];
  selectedGroups: string[];
  selectedBuildings: string[];
  selectedMapZones: string[];
  onToggleMapZone: (zoneId: string) => void;
  onClearMapZones: () => void;
  onToggleGroup: (groupId: string) => void;
  onAddBuilding: (buildingId: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onRemoveBuilding: (buildingId: string) => void;
}

export function BuildingFilter({
  groups,
  buildings,
  selectedGroups,
  selectedBuildings,
  selectedMapZones,
  onToggleMapZone,
  onClearMapZones,
  onToggleGroup,
  onAddBuilding,
  onRemoveGroup,
  onRemoveBuilding,
}: BuildingFilterProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-brand-foreground">
          Resort map
        </h3>
        <p className="mb-2 select-none text-xs text-slate-500">
          Click regions to add or remove selections. No selection = full resort
          view. Scroll to zoom; middle-click drag to pan.
        </p>
        <ResortMap
          selectedMapZones={selectedMapZones}
          onToggleMapZone={onToggleMapZone}
          onClearMapZones={onClearMapZones}
        />
      </div>

      {(selectedGroups.length > 0 || selectedBuildings.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {selectedGroups.map((groupId) => {
            const group = groups.find((g) => g.id === groupId);
            return (
              <Badge key={groupId} variant="outline" className="gap-1 pr-1">
                {group?.label}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4"
                  onClick={() => onRemoveGroup(groupId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
          {selectedBuildings.map((buildingId) => {
            const building = buildings.find((b) => b.id === buildingId);
            return (
              <Badge key={buildingId} variant="outline" className="gap-1 pr-1">
                {building?.name}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4"
                  onClick={() => onRemoveBuilding(buildingId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
