export type EnergyType = "electricity" | "gas" | "solar";
export type MetricView =
  | "electricity"
  | "gas"
  | "compare"
  | "solar"
  | "park-vs-hotel"
  | "hotels-kwh"
  | "hccp-gas"
  | "ccp-kwh"
  | "top-10"
  | "custom";
export type TimePreset = "ytd" | "month" | "day" | "custom";
export type CompareType = "day" | "month" | "year";
export type ChartGranularity =
  | "daily"
  | "monthly"
  | "yearly"
  | "by_installation";

export interface EnergyRecord {
  date: string;
  sourceId: string;
  energyType: EnergyType;
  valueKwh: number;
  costHkd: number | null;
}

export interface Building {
  id: string;
  name: string;
  group: string;
  sector?: string;
  area?: string;
}

export interface BuildingGroup {
  id: string;
  label: string;
  buildingIds: string[];
}

export interface BuildingTaxonomy {
  buildings: Building[];
  groups: BuildingGroup[];
}

export interface ColumnMapping {
  date: string;
  source_id: string;
  energy_type: string;
  value_kwh: string;
  cost_hkd: string;
}

export interface RelationEntry {
  id: string;
  title: string;
  description: string;
  appliesTo: {
    buildingIds: string[];
    groups: string[];
  };
  watchFor: string[];
}

export interface RelationsConfig {
  relations: RelationEntry[];
}

export interface EnergyTotals {
  electricity: { value: number; cost: number };
  gas: { value: number; cost: number };
  solar: { value: number; cost: number | null };
}

export interface ChartDataPoint {
  period: string;
  electricity?: number;
  gas?: number;
  generation?: number;
  byInstallation?: Record<string, number>;
}

export interface EnergyChart {
  granularity: ChartGranularity;
  data: ChartDataPoint[];
}

export interface ParkVsHotelChartPoint {
  period: string;
  label: string;
  themePark: number;
  hotel: number;
}

export type ParkVsHotelChartGranularity = "daily" | "monthly" | "yearly";

export interface ParkVsHotelChart {
  from: string;
  to: string;
  granularity: ParkVsHotelChartGranularity;
  data: ParkVsHotelChartPoint[];
}

export interface HotelsKwhChartPoint {
  period: string;
  label: string;
  dhh: number;
  dlh: number;
  del: number;
}

export interface HotelsKwhChart {
  from: string;
  to: string;
  granularity: ParkVsHotelChartGranularity;
  data: HotelsKwhChartPoint[];
}

export interface HccpGasChartPoint {
  period: string;
  label: string;
  gasUnits: number;
  outdoorTempC?: number;
  overallOccupancyPct?: number;
  ballroomUtilization?: number;
}

export interface HccpGasDualAxis {
  leftMax: number;
  rightMax: number;
  leftTicks: number[];
  rightTicks: number[];
}

export interface HccpGasChart {
  from: string;
  to: string;
  granularity: ParkVsHotelChartGranularity;
  data: HccpGasChartPoint[];
  axis: HccpGasDualAxis;
}

export interface SolarGenerationTrendPoint {
  period: string;
  label: string;
  generationKwh: number;
  sunshineHours?: number;
}

export interface SolarGenerationTrendAxis {
  leftMax: number;
  rightMax: number;
  leftTicks: number[];
  rightTicks: number[];
}

export interface SolarGenerationTrendChart {
  from: string;
  to: string;
  granularity: ParkVsHotelChartGranularity;
  data: SolarGenerationTrendPoint[];
  axis: SolarGenerationTrendAxis;
}

export interface CcpComparisonPoint {
  period: string;
  label: string;
  ccpKwh: number;
  outdoorTempC?: number;
}

export interface CcpComparisonAxis {
  leftMax: number;
  rightMax: number;
  leftTicks: number[];
  rightTicks: number[];
}

export interface CcpComparisonPanel {
  kind: "lastYear" | "thisYear";
  title: string;
  dateRangeLabel: string;
  from: string;
  to: string;
  data: CcpComparisonPoint[];
}

export interface CcpComparisonChart {
  granularity: ParkVsHotelChartGranularity;
  axis: CcpComparisonAxis;
  leftPanel: CcpComparisonPanel;
  rightPanel: CcpComparisonPanel;
}

export interface Top10BuildingChartSeries {
  dataKey: string;
  name: string;
  color: string;
}

export interface Top10BuildingChartPoint {
  meterId: string;
  label: string;
  fullLabel: string;
  [periodKey: string]: string | number;
}

export interface Top10BuildingChartAxis {
  leftMax: number;
  leftTicks: number[];
}

export interface Top10BuildingChart {
  title: string;
  granularity: ParkVsHotelChartGranularity;
  anchor: string;
  series: Top10BuildingChartSeries[];
  data: Top10BuildingChartPoint[];
  axis: Top10BuildingChartAxis;
}

export interface SolarInstallationBreakdownItem {
  id: string;
  label: string;
  kWh: number;
  mapZoneIds: string[];
}

export interface DailyBreakdown {
  park: number;
  ccp: number;
  hccp: number;
  dhh: number;
  dlh: number;
  del: number;
  hotelTotal: number;
  gasUnits: number;
  gasKwh: number;
  solarPark: number;
  solarHccp: number;
  solarTotal: number;
  /** Per-installation feed-in tariff (Summary_kWh_Data Input). */
  solarSites: SolarInstallationBreakdownItem[];
  resortElectricityTotal: number;
}

export interface PeriodReportExtremum {
  period: string;
  label: string;
  resortElectricityTotal: number;
}

export interface PeriodContextSummary {
  outdoorTempCAvg?: number;
  ballroomUtilizationPctAvg?: number;
  hotelOccupancyPctAvg?: number;
  sunshineHoursAvg?: number;
  rainfallMmAvg?: number;
  gasUnitsTotal: number;
  daysWithContext: number;
  /** Days with an explicit gas meter reading (including 0 maintenance days). */
  daysWithGasReadings: number;
}

export interface MonthlyReportSummary {
  from: string;
  to: string;
  periodLabel: string;
  totals: DailyBreakdown;
  daysInMonth: number;
  highestDay: PeriodReportExtremum;
  lowestDay: PeriodReportExtremum;
  context?: PeriodContextSummary | null;
}

export interface YearlyReportSummary {
  from: string;
  to: string;
  periodLabel: string;
  totals: DailyBreakdown;
  daysInYear: number;
  highestMonth: PeriodReportExtremum;
  lowestMonth: PeriodReportExtremum;
  context?: PeriodContextSummary | null;
}

export interface CustomRangeReportSummary {
  from: string;
  to: string;
  periodLabel: string;
  totals: DailyBreakdown;
  daysInRange: number;
  highestDay: PeriodReportExtremum;
  lowestDay: PeriodReportExtremum;
  context?: PeriodContextSummary | null;
}

export interface PeriodData {
  totals: EnergyTotals;
  metric: MetricView;
  chart: EnergyChart;
  solarChart: EnergyChart;
  parkVsHotelChart?: ParkVsHotelChart;
  hotelsKwhChart?: HotelsKwhChart;
  hccpGasChart?: HccpGasChart;
  solarGenerationTrendChart?: SolarGenerationTrendChart;
  ccpComparisonChart?: CcpComparisonChart;
  top10BuildingChart?: Top10BuildingChart;
  dailyBreakdown?: DailyBreakdown;
  monthlyReportSummary?: MonthlyReportSummary;
  yearlyReportSummary?: YearlyReportSummary;
  customRangeReportSummary?: CustomRangeReportSummary;
}

export interface DeltaTotals {
  electricity: { valuePct: number; costPct: number };
  gas: { valuePct: number; costPct: number };
  solar: { valuePct: number };
}

export interface ComparisonData extends PeriodData {
  delta: DeltaTotals;
}

export interface EnergyQueryParams {
  from?: string;
  to?: string;
  singleDay?: string;
  selectedMonth?: string;
  selectedYear?: string;
  sourceIds?: string[];
  metric?: MetricView;
  timePreset?: TimePreset;
  compare?: boolean;
  compareType?: CompareType;
  compareFrom?: string;
  compareTo?: string;
}

export interface EnergyApiResponse {
  primary: PeriodData;
  comparison?: ComparisonData;
  scopeLabel: string;
}
