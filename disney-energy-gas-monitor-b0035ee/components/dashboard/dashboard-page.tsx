"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  canShiftDay,
  canShiftMonth,
  canShiftYear,
  clampIsoDate,
  clampMonthKey,
  clampYearKey,
  capSelectableMaxDate,
  shiftDay,
  shiftMonth,
  shiftYear,
} from "@/lib/time-presets";
import type { MasterSheetUploadMeta } from "@/lib/master-sheet-upload-meta";
import { CustomGraphSessionProvider } from "@/components/dashboard/custom-graph/custom-graph-session";
import { CustomGraphWorkspaceHost } from "@/components/dashboard/custom-graph/custom-graph-workspace-host";
import { FilterSidebar } from "@/components/dashboard/filter-sidebar";
import { MetricViewTabs } from "@/components/dashboard/metric-view-tabs";
import { PeriodComparisonWorkspace } from "@/components/dashboard/period-comparison/period-comparison-workspace";
import { DailyReportEmptyState } from "@/components/dashboard/daily-report-empty-state";
import { DailySummaryPanel } from "@/components/dashboard/daily-summary-panel";
import { MonthlySummaryPanel } from "@/components/dashboard/monthly-summary-panel";
import { CustomRangeSummaryPanel } from "@/components/dashboard/custom-range-summary-panel";
import { YearlySummaryPanel } from "@/components/dashboard/yearly-summary-panel";
import { Badge } from "@/components/ui/badge";
import type { DailyContext } from "@/lib/daily-context";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { formatIsoRangeShort } from "@/lib/date-display";
import type { MapZoneEnergyResult } from "@/lib/resort-map/aggregate-energy";
import { getMapZone } from "@/lib/resort-map/registry";
import { getHeaderScopeLabel } from "@/lib/taxonomy";
import type {
  Building,
  BuildingGroup,
  EnergyApiResponse,
  MetricView,
  RelationEntry,
  TimePreset,
} from "@/lib/types";

const MainChart = dynamic(
  () => import("@/components/dashboard/main-chart").then((mod) => mod.MainChart),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-brand-border bg-white text-sm text-brand-muted"
        style={{ height: 320 }}
      >
        Loading chart…
      </div>
    ),
  },
);

function formatMonthBadgeLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

function formatDayBadgeLabel(date: string): string {
  return parseISO(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface DashboardPageProps {
  initialBuildings: Building[];
  initialGroups: BuildingGroup[];
  initialRelations: RelationEntry[];
  initialData: EnergyApiResponse;
  initialDailyContext: DailyContext | null;
  defaultDate: string;
  dataMinDate: string;
  dataMaxDate: string;
}

export function DashboardPage({
  initialBuildings,
  initialGroups,
  initialRelations,
  initialData,
  initialDailyContext,
  defaultDate: initialDefaultDate,
  dataMinDate: initialDataMinDate,
  dataMaxDate: initialDataMaxDate,
}: DashboardPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skipInitialFetchRef = useRef(true);
  const energyFetchIdRef = useRef(0);
  const initialDailyContextRef = useRef(initialDailyContext);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const [dataMinDate, setDataMinDate] = useState(initialDataMinDate);
  const [dataMaxDate, setDataMaxDate] = useState(initialDataMaxDate);
  const [defaultDate, setDefaultDate] = useState(initialDefaultDate);

  const dataMinMonth = dataMinDate.slice(0, 7);
  const dataMaxMonth = dataMaxDate.slice(0, 7);
  const dataMinYear = dataMinDate.slice(0, 4);
  const dataMaxYear = dataMaxDate.slice(0, 4);

  useEffect(() => {
    setDataMinDate(initialDataMinDate);
    setDataMaxDate(initialDataMaxDate);
    setDefaultDate(initialDefaultDate);
  }, [initialDataMinDate, initialDataMaxDate, initialDefaultDate]);

  const [buildings, setBuildings] = useState<Building[]>(initialBuildings);
  const [groups, setGroups] = useState<BuildingGroup[]>(initialGroups);
  const [relations, setRelations] = useState<RelationEntry[]>(initialRelations);
  const [data, setData] = useState<EnergyApiResponse | null>(initialData);
  const [dailyContext, setDailyContext] = useState<DailyContext | null>(
    initialDailyContext,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapZoneSummariesLoading, setMapZoneSummariesLoading] = useState(false);
  const [mapZoneSummaries, setMapZoneSummaries] = useState<
    MapZoneEnergyResult[]
  >([]);
  const [periodComparisonOpen, setPeriodComparisonOpen] = useState(false);

  const metricParam = searchParams.get("metric");
  const metric: MetricView =
    metricParam === "electricity" ||
    metricParam === "gas" ||
    metricParam === "compare" ||
    metricParam === "solar" ||
    metricParam === "park-vs-hotel" ||
    metricParam === "hotels-kwh" ||
    metricParam === "hccp-gas" ||
    metricParam === "ccp-kwh" ||
    metricParam === "top-10" ||
    metricParam === "custom"
      ? metricParam
      : "compare";
  const timePreset = (searchParams.get("timePreset") as TimePreset) || "day";
  const groupsParam = searchParams.get("groups") ?? "";
  const buildingsParam = searchParams.get("buildings") ?? "";
  const selectedGroups = groupsParam ? groupsParam.split(",").filter(Boolean) : [];
  const selectedBuildings = buildingsParam
    ? buildingsParam.split(",").filter(Boolean)
    : [];
  const selectedMapZones = useMemo(() => {
    const fromList = (searchParams.get("mapZones") ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((id) => Boolean(getMapZone(id)));

    if (fromList.length > 0) return fromList;

    const legacy = searchParams.get("mapZone")?.trim();
    if (legacy && getMapZone(legacy)) return [legacy];

    return [];
  }, [searchParams]);
  const customFromParam = searchParams.get("from");
  const customToParam = searchParams.get("to");
  const singleDayParam =
    searchParams.get("singleDay") ||
    (timePreset === "day" ? customFromParam : null);
  const singleDay = clampIsoDate(
    singleDayParam || defaultDate,
    dataMinDate,
    dataMaxDate,
  );
  const selectedMonth = clampMonthKey(
    searchParams.get("selectedMonth") || dataMaxMonth,
    dataMinMonth,
    dataMaxMonth,
  );
  const selectedYear = clampYearKey(
    searchParams.get("selectedYear") || dataMaxYear,
    dataMinYear,
    dataMaxYear,
  );
  const customFrom = customFromParam ?? "";
  const customTo = customToParam ?? "";
  const customRangeReady = Boolean(customFromParam && customToParam);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (timePreset !== "day" || !singleDayParam) return;
    if (singleDayParam === singleDay) return;
    updateParams({ singleDay, from: singleDay });
  }, [timePreset, singleDayParam, singleDay, updateParams]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("metric", metric === "custom" ? "compare" : metric);
    params.set("timePreset", timePreset);
    if (groupsParam) params.set("groups", groupsParam);
    if (buildingsParam) params.set("buildings", buildingsParam);
    if (timePreset === "day") params.set("from", singleDay);
    if (timePreset === "month") params.set("selectedMonth", selectedMonth);
    if (timePreset === "ytd") params.set("selectedYear", selectedYear);
    if (timePreset === "custom" && customRangeReady) {
      params.set("from", customFromParam!);
      params.set("to", customToParam!);
    }
    return params.toString();
  }, [
    metric,
    timePreset,
    groupsParam,
    buildingsParam,
    singleDay,
    selectedMonth,
    selectedYear,
    customFromParam,
    customToParam,
    customRangeReady,
  ]);

  const timeFrameBadgeLabel =
    timePreset === "day"
      ? formatDayBadgeLabel(singleDay)
      : timePreset === "month"
        ? formatMonthBadgeLabel(selectedMonth)
        : timePreset === "ytd"
          ? selectedYear
          : customRangeReady
            ? formatIsoRangeShort(customFromParam!, customToParam!)
            : "Custom range";

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    if (timePreset === "custom" && !customRangeReady) {
      setLoading(false);
      return;
    }

    const fetchId = ++energyFetchIdRef.current;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 120000);

    setError(null);
    setLoading(true);

    fetch(`/api/energy?${queryString}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Energy API returned ${res.status}`);
        }
        return res.json();
      })
      .then((json: EnergyApiResponse) => {
        if (fetchId !== energyFetchIdRef.current) return;
        setData(json);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        if (fetchId !== energyFetchIdRef.current) return;
        setError(err.message || "Failed to load energy data");
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (fetchId === energyFetchIdRef.current) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [queryString, timePreset, customRangeReady, dataRefreshKey]);

  const handleMasterSheetUploaded = useCallback(
    (meta: MasterSheetUploadMeta) => {
      const previousMax = dataMaxDate;
      const nextMax = meta.latestDate
        ? capSelectableMaxDate(meta.latestDate)
        : dataMaxDate;
      const nextMin = meta.earliestDate ?? dataMinDate;

      setDataMinDate(nextMin);
      setDataMaxDate(nextMax);
      setDefaultDate(nextMax);
      initialDailyContextRef.current = null;
      setDataRefreshKey((key) => key + 1);

      if (timePreset === "day") {
        const shouldJumpToLatest =
          singleDay === previousMax || singleDay > nextMax;
        if (shouldJumpToLatest) {
          updateParams({ singleDay: nextMax, from: nextMax });
        }
      } else if (timePreset === "month") {
        const monthMax = nextMax.slice(0, 7);
        if (selectedMonth > monthMax) {
          updateParams({ selectedMonth: monthMax });
        }
      } else if (timePreset === "ytd") {
        const yearMax = nextMax.slice(0, 4);
        if (selectedYear > yearMax) {
          updateParams({ selectedYear: yearMax });
        }
      }

      router.refresh();
    },
    [
      dataMaxDate,
      dataMinDate,
      router,
      selectedMonth,
      selectedYear,
      singleDay,
      timePreset,
      updateParams,
    ],
  );

  useEffect(() => {
    if (timePreset !== "day") {
      setDailyContext(null);
      return;
    }

    if (singleDay === defaultDate && initialDailyContextRef.current) {
      setDailyContext(initialDailyContextRef.current);
      return;
    }

    fetch(`/api/daily-context?date=${singleDay}`)
      .then((res) => res.json())
      .then((json) => setDailyContext(json.context))
      .catch(() => setDailyContext(null));
  }, [timePreset, singleDay, defaultDate, dataRefreshKey]);

  useEffect(() => {
    const relationParams = new URLSearchParams();
    if (groupsParam) relationParams.set("groups", groupsParam);
    if (buildingsParam) relationParams.set("buildings", buildingsParam);

    fetch(`/api/relations?${relationParams.toString()}`)
      .then((res) => res.json())
      .then((json) => setRelations(json.relations))
      .catch(() => setRelations([]));
  }, [groupsParam, buildingsParam]);

  const mapEnergyQueryString = useMemo(() => {
    if (selectedMapZones.length === 0) return null;
    const params = new URLSearchParams();
    params.set("zones", selectedMapZones.join(","));
    params.set("timePreset", timePreset);
    if (timePreset === "day") {
      params.set("singleDay", singleDay);
      params.set("from", singleDay);
    }
    if (timePreset === "month") params.set("selectedMonth", selectedMonth);
    if (timePreset === "ytd") params.set("selectedYear", selectedYear);
    if (timePreset === "custom" && customRangeReady) {
      params.set("from", customFromParam!);
      params.set("to", customToParam!);
    }
    return params.toString();
  }, [
    selectedMapZones,
    timePreset,
    singleDay,
    selectedMonth,
    selectedYear,
    customFromParam,
    customToParam,
    customRangeReady,
  ]);

  useEffect(() => {
    if (!mapEnergyQueryString) {
      setMapZoneSummaries([]);
      setMapZoneSummariesLoading(false);
      return;
    }

    if (timePreset === "custom" && !customRangeReady) {
      setMapZoneSummariesLoading(false);
      return;
    }

    const controller = new AbortController();
    setMapZoneSummariesLoading(true);

    fetch(`/api/map-energy?${mapEnergyQueryString}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Map energy API returned ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const zones = (json.zones ?? []) as MapZoneEnergyResult[];
        setMapZoneSummaries(zones);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setMapZoneSummaries(
          selectedMapZones.map((zoneId) => ({
            zoneId,
            label: getMapZone(zoneId)?.label ?? zoneId,
            totalKwh: 0,
            solarKwh: null,
            solarSites: [],
            hasData: false,
            emptyMessage: "Could not load map selection data.",
          })),
        );
      })
      .finally(() => setMapZoneSummariesLoading(false));

    return () => controller.abort();
  }, [mapEnergyQueryString, timePreset, customRangeReady, selectedMapZones]);

  const handleReset = () => {
    router.replace(
      `?timePreset=day&singleDay=${defaultDate}&metric=compare`,
      { scroll: false },
    );
    setData(initialData);
    setDailyContext(initialDailyContext);
    setError(null);
    setLoading(false);
  };

  const scopeLabel = selectedMapZones.length
    ? selectedMapZones
        .map((id) => getMapZone(id)?.label ?? id)
        .join(", ")
    : getHeaderScopeLabel(selectedGroups, selectedBuildings);
  const hasContent =
    Boolean(data) && (timePreset !== "custom" || customRangeReady);
  const maxMonth = dataMaxMonth;
  const maxYear = dataMaxYear;

  const goToPreviousDay = () => {
    const next = clampIsoDate(
      shiftDay(singleDay, -1),
      dataMinDate,
      dataMaxDate,
    );
    updateParams({ singleDay: next, from: next });
  };

  const goToNextDay = () => {
    const next = clampIsoDate(
      shiftDay(singleDay, 1),
      dataMinDate,
      dataMaxDate,
    );
    updateParams({ singleDay: next, from: next });
  };

  const goToPreviousMonth = () => {
    const next = clampMonthKey(
      shiftMonth(selectedMonth, -1),
      dataMinMonth,
      dataMaxMonth,
    );
    updateParams({ selectedMonth: next });
  };

  const goToNextMonth = () => {
    const next = clampMonthKey(
      shiftMonth(selectedMonth, 1),
      dataMinMonth,
      dataMaxMonth,
    );
    updateParams({ selectedMonth: next });
  };

  const goToPreviousYear = () => {
    const next = clampYearKey(
      shiftYear(selectedYear, -1),
      dataMinYear,
      dataMaxYear,
    );
    updateParams({ selectedYear: next });
  };

  const goToNextYear = () => {
    const next = clampYearKey(
      shiftYear(selectedYear, 1),
      dataMinYear,
      dataMaxYear,
    );
    updateParams({ selectedYear: next });
  };

  return (
    <CustomGraphSessionProvider>
    <div className="min-h-screen bg-brand-light">
      <header className="border-b border-brand-dark bg-brand text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <h1 className="text-2xl font-bold">HKDL Energy Dashboard</h1>
            <p className="text-sm text-white/80">
              Electricity, gas, and solar across the full resort
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="border-white/30 bg-white/15 text-white"
            >
              {scopeLabel}
            </Badge>
            <Badge
              variant="outline"
              className="border-white/40 text-white"
            >
              {timeFrameBadgeLabel}
            </Badge>
            {loading && (
              <Badge
                variant="secondary"
                className="gap-1 border-white/30 bg-white/15 text-white"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating…
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:items-start lg:px-8">
        <div className="order-2 min-w-0 flex-1 space-y-6 md:order-1">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
              {error}
            </div>
          )}

          {hasContent && data && (
            <div className="space-y-6">
              {timePreset === "day" &&
                (data.primary.dailyBreakdown ? (
                  <DailySummaryPanel
                    date={singleDay}
                    context={dailyContext}
                    breakdown={data.primary.dailyBreakdown}
                    onPreviousDay={goToPreviousDay}
                    onNextDay={goToNextDay}
                    canGoPreviousDay={canShiftDay(
                      singleDay,
                      -1,
                      dataMinDate,
                      dataMaxDate,
                    )}
                    canGoNextDay={canShiftDay(
                      singleDay,
                      1,
                      dataMinDate,
                      dataMaxDate,
                    )}
                    mapZoneSummaries={
                      selectedMapZones.length > 0 ? mapZoneSummaries : null
                    }
                    mapZoneSummariesLoading={mapZoneSummariesLoading}
                  />
                ) : (
                  <DailyReportEmptyState
                    date={singleDay}
                    latestAvailableDate={dataMaxDate}
                    onPreviousDay={goToPreviousDay}
                    onNextDay={goToNextDay}
                    canGoPreviousDay={canShiftDay(
                      singleDay,
                      -1,
                      dataMinDate,
                      dataMaxDate,
                    )}
                    canGoNextDay={canShiftDay(
                      singleDay,
                      1,
                      dataMinDate,
                      dataMaxDate,
                    )}
                  />
                ))}

              {timePreset === "month" && data.primary.monthlyReportSummary && (
                <MonthlySummaryPanel
                  summary={data.primary.monthlyReportSummary}
                  onPreviousMonth={goToPreviousMonth}
                  onNextMonth={goToNextMonth}
                  canGoPreviousMonth={canShiftMonth(
                    selectedMonth,
                    -1,
                    dataMinMonth,
                    maxMonth,
                  )}
                  canGoNextMonth={canShiftMonth(
                    selectedMonth,
                    1,
                    dataMinMonth,
                    maxMonth,
                  )}
                  mapZoneSummaries={
                    selectedMapZones.length > 0 ? mapZoneSummaries : null
                  }
                  mapZoneSummariesLoading={mapZoneSummariesLoading}
                />
              )}

              {timePreset === "ytd" && data.primary.yearlyReportSummary && (
                <YearlySummaryPanel
                  summary={data.primary.yearlyReportSummary}
                  onPreviousYear={goToPreviousYear}
                  onNextYear={goToNextYear}
                  canGoPreviousYear={canShiftYear(
                    selectedYear,
                    -1,
                    dataMinYear,
                    maxYear,
                  )}
                  canGoNextYear={canShiftYear(
                    selectedYear,
                    1,
                    dataMinYear,
                    maxYear,
                  )}
                  mapZoneSummaries={
                    selectedMapZones.length > 0 ? mapZoneSummaries : null
                  }
                  mapZoneSummariesLoading={mapZoneSummariesLoading}
                />
              )}

              {timePreset === "custom" && !customRangeReady && (
                <div className="rounded-lg border border-dashed border-brand-border bg-white px-4 py-8 text-center text-sm text-slate-600">
                  Select a start and end date on the calendar in the sidebar.
                </div>
              )}

              {timePreset === "custom" &&
                customRangeReady &&
                data.primary.customRangeReportSummary && (
                  <CustomRangeSummaryPanel
                    summary={data.primary.customRangeReportSummary}
                    mapZoneSummaries={
                      selectedMapZones.length > 0 ? mapZoneSummaries : null
                    }
                    mapZoneSummariesLoading={mapZoneSummariesLoading}
                  />
                )}

              <MetricViewTabs
                value={metric}
                timePreset={timePreset}
                onChange={(value) => updateParams({ metric: value })}
              />

              <MainChart
                data={data}
                metric={metric}
                timePreset={timePreset}
                energyQueryString={queryString}
                customRangeReady={customRangeReady}
              />

            </div>
          )}
        </div>

        <div className="order-1 w-full shrink-0 md:order-2 md:w-[280px] lg:w-[320px]">
        <FilterSidebar
          groups={groups}
          buildings={buildings}
          relations={relations}
          selectedGroups={selectedGroups}
          selectedBuildings={selectedBuildings}
          selectedMapZones={selectedMapZones}
          onToggleMapZone={(zoneId) => {
            const next = selectedMapZones.includes(zoneId)
              ? selectedMapZones.filter((id) => id !== zoneId)
              : [...selectedMapZones, zoneId];
            updateParams({
              mapZones: next.length ? next.join(",") : null,
              mapZone: null,
              groups: null,
              buildings: null,
            });
          }}
          onClearMapZones={() => {
            updateParams({ mapZones: null, mapZone: null });
          }}
          timePreset={timePreset}
          singleDay={singleDay}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          customFrom={customFrom}
          customTo={customTo}
          dataMinDate={dataMinDate}
          dataMaxDate={dataMaxDate}
          onOpenPeriodComparison={() => setPeriodComparisonOpen(true)}
          onToggleGroup={(groupId) => {
            const next = selectedGroups.includes(groupId)
              ? selectedGroups.filter((id) => id !== groupId)
              : [...selectedGroups, groupId];
            updateParams({ groups: next.length ? next.join(",") : null });
          }}
          onAddBuilding={(buildingId) => {
            if (!selectedBuildings.includes(buildingId)) {
              updateParams({
                buildings: [...selectedBuildings, buildingId].join(","),
              });
            }
          }}
          onRemoveGroup={(groupId) => {
            updateParams({
              groups: selectedGroups.filter((id) => id !== groupId).join(",") || null,
            });
          }}
          onRemoveBuilding={(buildingId) => {
            updateParams({
              buildings:
                selectedBuildings.filter((id) => id !== buildingId).join(",") || null,
            });
          }}
          onPresetChange={(preset) => {
            const updates: Record<string, string | null> = {
              timePreset: preset,
            };
            if (preset === "month") {
              updates.selectedMonth = selectedMonth;
            }
            if (preset === "ytd") {
              updates.selectedYear = selectedYear;
            }
            updateParams(updates);
          }}
          onSingleDayChange={(day) => {
            const next = clampIsoDate(day, dataMinDate, dataMaxDate);
            updateParams({ singleDay: next, from: next });
          }}
          onSelectedMonthChange={(month) => {
            const next = clampMonthKey(month, dataMinMonth, dataMaxMonth);
            updateParams({ selectedMonth: next });
          }}
          onSelectedYearChange={(year) => {
            const next = clampYearKey(year, dataMinYear, dataMaxYear);
            updateParams({ selectedYear: next });
          }}
          onCustomRangeCommit={(from, to) =>
            updateParams({ from, to })
          }
          onClearCustomRange={() => {
            updateParams({ from: null, to: null });
            setError(null);
          }}
          onReset={handleReset}
          onMasterSheetUploaded={handleMasterSheetUploaded}
        />
        </div>
      </main>
      <CustomGraphWorkspaceHost
        queryString={queryString}
        timePreset={timePreset}
        customRangeReady={customRangeReady}
      />
      <PeriodComparisonWorkspace
        open={periodComparisonOpen}
        onOpenChange={setPeriodComparisonOpen}
        dataMinDate={dataMinDate}
        dataMaxDate={dataMaxDate}
        defaultDay={singleDay}
        defaultMonth={selectedMonth}
        defaultYear={selectedYear}
      />
    </div>
    </CustomGraphSessionProvider>
  );
}
