export interface SolarInstallationSiteConfig {
  id: string;
  /** Shown in the Solar Generated (kWh) dropdown. */
  displayLabel: string;
  /** Column headers in Summary_kWh_Data Input (summed when multiple). */
  excelColumns: string[];
  /** Map zone ids that should show this site's solar (empty = summary only). */
  mapZoneIds: string[];
}

/**
 * Feed-in tariff sheet → resort map / summary labels.
 * Order matches the requested dropdown sequence.
 */
export const SOLAR_INSTALLATION_SITES: SolarInstallationSiteConfig[] = [
  { id: "202", displayLabel: "202", excelColumns: ["202"], mapZoneIds: ["202"] },
  { id: "205", displayLabel: "205", excelColumns: ["205"], mapZoneIds: ["205"] },
  { id: "207", displayLabel: "207", excelColumns: ["207"], mapZoneIds: ["207"] },
  { id: "211", displayLabel: "211", excelColumns: ["211"], mapZoneIds: ["211"] },
  { id: "302", displayLabel: "302", excelColumns: ["302"], mapZoneIds: ["302"] },
  {
    id: "304_307",
    displayLabel: "304/307",
    excelColumns: ["304"],
    mapZoneIds: ["304_307"],
  },
  {
    id: "310m_310s",
    displayLabel: "310M/310S",
    excelColumns: ["310S"],
    mapZoneIds: ["310m_310s"],
  },
  {
    id: "409",
    displayLabel: "409",
    excelColumns: ["409"],
    mapZoneIds: ["402_408_409"],
  },
  { id: "413", displayLabel: "413", excelColumns: ["413"], mapZoneIds: ["413"] },
  { id: "414", displayLabel: "414", excelColumns: ["414"], mapZoneIds: ["414"] },
  {
    id: "501",
    displayLabel: "501",
    excelColumns: ["501"],
    mapZoneIds: ["501_502"],
  },
  {
    id: "506",
    displayLabel: "506",
    excelColumns: ["506"],
    mapZoneIds: ["506_507_509"],
  },
  { id: "521", displayLabel: "521", excelColumns: ["521"], mapZoneIds: ["521"] },
  { id: "522", displayLabel: "522", excelColumns: ["522"], mapZoneIds: ["522"] },
  { id: "531", displayLabel: "531", excelColumns: ["531"], mapZoneIds: ["531"] },
  {
    id: "602",
    displayLabel: "602",
    excelColumns: ["602", "602 TD Carpark"],
    mapZoneIds: ["602"],
  },
  { id: "603", displayLabel: "603", excelColumns: ["603"], mapZoneIds: ["603"] },
  {
    id: "604",
    displayLabel: "604",
    excelColumns: ["604", "604 Canopy", "604C", "604H"],
    mapZoneIds: ["604"],
  },
  { id: "609", displayLabel: "609", excelColumns: ["609"], mapZoneIds: ["609"] },
  { id: "610", displayLabel: "610", excelColumns: ["610"], mapZoneIds: ["610"] },
  {
    id: "613",
    displayLabel: "613",
    excelColumns: ["613", "613A"],
    mapZoneIds: ["613"],
  },
  {
    id: "615",
    displayLabel: "615",
    excelColumns: ["615"],
    mapZoneIds: [],
  },
  { id: "620", displayLabel: "620", excelColumns: ["620"], mapZoneIds: ["620"] },
  {
    id: "ss208_638",
    displayLabel: "SS208/638",
    excelColumns: ["638"],
    mapZoneIds: ["ss208"],
  },
  { id: "641", displayLabel: "641", excelColumns: ["641"], mapZoneIds: ["641"] },
  {
    id: "642",
    displayLabel: "642",
    excelColumns: ["642"],
    mapZoneIds: ["552_642"],
  },
  { id: "643", displayLabel: "643", excelColumns: ["643"], mapZoneIds: ["643"] },
  {
    id: "ccp",
    displayLabel: "CCP",
    excelColumns: [
      "611 CCP",
      "CCP2",
      "CCP2 Lawn",
      "CCP2 Switch Rm",
    ],
    mapZoneIds: ["ccp"],
  },
  { id: "csb", displayLabel: "CSB", excelColumns: ["CSB"], mapZoneIds: ["csb"] },
  {
    id: "dhh",
    displayLabel: "DHH",
    excelColumns: ["DHH Roof 1", "DHH Roof 2"],
    mapZoneIds: ["dhh"],
  },
  {
    id: "dlh",
    displayLabel: "DLH",
    excelColumns: ["DLH Ball Rm"],
    mapZoneIds: ["dlh"],
  },
  {
    id: "iwps_ss",
    displayLabel: "IWPS SS",
    excelColumns: ["IWPS SS"],
    mapZoneIds: [],
  },
  {
    id: "ss205",
    displayLabel: "SS205",
    excelColumns: ["SS205A", "SS205B"],
    mapZoneIds: ["ss205"],
  },
  {
    id: "ss207",
    displayLabel: "SS207",
    excelColumns: ["637"],
    mapZoneIds: ["ss207"],
  },
  {
    id: "ss210",
    displayLabel: "SS210",
    excelColumns: ["SS210 (907)"],
    mapZoneIds: ["ss210"],
  },
  {
    id: "pump_station",
    displayLabel: "Pump Station",
    excelColumns: ["Pump Station"],
    mapZoneIds: [],
  },
];

const siteById = new Map(
  SOLAR_INSTALLATION_SITES.map((site) => [site.id, site]),
);

export function getSolarInstallationSite(
  siteId: string,
): SolarInstallationSiteConfig | undefined {
  return siteById.get(siteId);
}
