"use client";

import { BuildingFilter } from "@/components/dashboard/building-filter";
import { MasterSheetUpload } from "@/components/dashboard/master-sheet-upload";
import { PeriodComparisonButton } from "@/components/dashboard/period-comparison/period-comparison-button";
import { RelationsPanel } from "@/components/dashboard/relations-panel";
import { TimeFilter } from "@/components/dashboard/time-filter";
import { Separator } from "@/components/ui/separator";
import type { MasterSheetUploadMeta } from "@/lib/master-sheet-upload-meta";
import type {
  Building,
  BuildingGroup,
  RelationEntry,
  TimePreset,
} from "@/lib/types";

interface FilterSidebarProps {
  groups: BuildingGroup[];
  buildings: Building[];
  relations: RelationEntry[];
  selectedGroups: string[];
  selectedBuildings: string[];
  selectedMapZones: string[];
  onToggleMapZone: (zoneId: string) => void;
  onClearMapZones: () => void;
  timePreset: TimePreset;
  singleDay: string;
  selectedMonth: string;
  selectedYear: string;
  customFrom: string;
  customTo: string;
  dataMinDate: string;
  dataMaxDate: string;
  onOpenPeriodComparison: () => void;
  onToggleGroup: (groupId: string) => void;
  onAddBuilding: (buildingId: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onRemoveBuilding: (buildingId: string) => void;
  onPresetChange: (preset: TimePreset) => void;
  onSingleDayChange: (day: string) => void;
  onSelectedMonthChange: (month: string) => void;
  onSelectedYearChange: (year: string) => void;
  onCustomRangeCommit: (from: string, to: string) => void;
  onClearCustomRange: () => void;
  onReset: () => void;
  onMasterSheetUploaded?: (meta: MasterSheetUploadMeta) => void;
}

export function FilterSidebar(props: FilterSidebarProps) {
  return (
    <aside className="sticky top-6 space-y-6 rounded-xl border border-brand-border bg-white p-5 shadow-sm md:top-6">
      <BuildingFilter
        groups={props.groups}
        buildings={props.buildings}
        selectedGroups={props.selectedGroups}
        selectedBuildings={props.selectedBuildings}
        selectedMapZones={props.selectedMapZones}
        onToggleMapZone={props.onToggleMapZone}
        onClearMapZones={props.onClearMapZones}
        onToggleGroup={props.onToggleGroup}
        onAddBuilding={props.onAddBuilding}
        onRemoveGroup={props.onRemoveGroup}
        onRemoveBuilding={props.onRemoveBuilding}
      />

      <Separator />

      <TimeFilter
        timePreset={props.timePreset}
        singleDay={props.singleDay}
        selectedMonth={props.selectedMonth}
        selectedYear={props.selectedYear}
        customFrom={props.customFrom}
        customTo={props.customTo}
        dataMinDate={props.dataMinDate}
        dataMaxDate={props.dataMaxDate}
        onPresetChange={props.onPresetChange}
        onSingleDayChange={props.onSingleDayChange}
        onSelectedMonthChange={props.onSelectedMonthChange}
        onSelectedYearChange={props.onSelectedYearChange}
        onCustomRangeCommit={props.onCustomRangeCommit}
        onClearCustomRange={props.onClearCustomRange}
        onReset={props.onReset}
      />

      <Separator />

      <PeriodComparisonButton onClick={props.onOpenPeriodComparison} />

      <RelationsPanel relations={props.relations} />

      <Separator />

      <MasterSheetUpload onUploadSuccess={props.onMasterSheetUploaded} />
    </aside>
  );
}
