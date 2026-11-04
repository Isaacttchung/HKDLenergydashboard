/**
 * Parsed from Formula-DailyWeb4.xlsm sheet **CHHP** (link [1]/[3]/[4]/[5] Mercury raws).
 * Master output = CHHP **G** (Solar Consumption) = **D** (import Δ) + **H** (SUM feed-in K:R).
 */

export type PowerSolarArea = "CCP" | "HCCP" | "Hotel" | "Park";

export type MercuryRawLogicalId =
  | "Mercury_CCP"
  | "Mercury_HCCP"
  | "Mercury_Hotel"
  | "Mercury_Park";

export interface PowerSolarMeterMapping {
  area: PowerSolarArea;
  rawLogicalId: MercuryRawLogicalId;
  rawColumnLetter: string;
  masterColumnHeader: string;
  chhpMeterId: string;
  /** Summary_kWh_Data Input column letters (CHHP K–R XLOOKUP refs). */
  feedInTariffColumns: string[];
}

export const POWER_SOLAR_METER_MAPPINGS: PowerSolarMeterMapping[] = [
  {
    area: "CCP",
    rawLogicalId: "Mercury_CCP",
    rawColumnLetter: "G",
    masterColumnHeader: "SS205A_TxA (kWh)",
    chhpMeterId: "SS205A_TxA",
    feedInTariffColumns: ["AG"],
  },
  {
    area: "CCP",
    rawLogicalId: "Mercury_CCP",
    rawColumnLetter: "J",
    masterColumnHeader: "SS205A_TxB (kWh)",
    chhpMeterId: "SS205A_TxB",
    feedInTariffColumns: ["AP"],
  },
  {
    area: "CCP",
    rawLogicalId: "Mercury_CCP",
    rawColumnLetter: "M",
    masterColumnHeader: "SS205A_TxC (kWh)",
    chhpMeterId: "SS205A_TxC",
    feedInTariffColumns: [],
  },
  {
    area: "CCP",
    rawLogicalId: "Mercury_CCP",
    rawColumnLetter: "P",
    masterColumnHeader: "SS205B_TxA (kWh)",
    chhpMeterId: "SS205B_TxA",
    feedInTariffColumns: ["AQ"],
  },
  {
    area: "CCP",
    rawLogicalId: "Mercury_CCP",
    rawColumnLetter: "S",
    masterColumnHeader: "SS205B_TxB (kWh)",
    chhpMeterId: "SS205B_TxB",
    feedInTariffColumns: [],
  },
  {
    area: "CCP",
    rawLogicalId: "Mercury_CCP",
    rawColumnLetter: "V",
    masterColumnHeader: "SS205B_TxC (kWh)",
    chhpMeterId: "SS205B_TxC",
    feedInTariffColumns: [],
  },
  {
    area: "CCP",
    rawLogicalId: "Mercury_CCP",
    rawColumnLetter: "B",
    masterColumnHeader: "EA8",
    chhpMeterId: "EA8",
    feedInTariffColumns: [],
  },
  {
    area: "HCCP",
    rawLogicalId: "Mercury_HCCP",
    rawColumnLetter: "D",
    masterColumnHeader: "SS303A_TxA (kWh)",
    chhpMeterId: "SS303A_Tx_A",
    feedInTariffColumns: ["AI", "AJ"],
  },
  {
    area: "HCCP",
    rawLogicalId: "Mercury_HCCP",
    rawColumnLetter: "G",
    masterColumnHeader: "SS303B_TxD2 (kWh)",
    chhpMeterId: "SS303B_Tx_D2",
    feedInTariffColumns: ["AH"],
  },
  {
    area: "HCCP",
    rawLogicalId: "Mercury_HCCP",
    rawColumnLetter: "J",
    masterColumnHeader: "SS303B_TxD3 (kWh)",
    chhpMeterId: "SS303B_Tx_D3",
    feedInTariffColumns: ["AK"],
  },
  {
    area: "HCCP",
    rawLogicalId: "Mercury_HCCP",
    rawColumnLetter: "K",
    masterColumnHeader: "SS303B_TxD3_C12 CSB",
    chhpMeterId: "SS303B-12",
    feedInTariffColumns: [],
  },
  {
    area: "Hotel",
    rawLogicalId: "Mercury_Hotel",
    rawColumnLetter: "D",
    masterColumnHeader: "SS301_TxA (kWh)",
    chhpMeterId: "SS301_Tx_A",
    feedInTariffColumns: [],
  },
  {
    area: "Hotel",
    rawLogicalId: "Mercury_Hotel",
    rawColumnLetter: "G",
    masterColumnHeader: "SS301_TxB (kWh)",
    chhpMeterId: "SS301_Tx_B",
    feedInTariffColumns: [],
  },
  {
    area: "Hotel",
    rawLogicalId: "Mercury_Hotel",
    rawColumnLetter: "J",
    masterColumnHeader: "SS301_TxC (kWh)",
    chhpMeterId: "SS301_Tx_C",
    feedInTariffColumns: ["AL", "AM"],
  },
  {
    area: "Hotel",
    rawLogicalId: "Mercury_Hotel",
    rawColumnLetter: "M",
    masterColumnHeader: "SS302A_TxA1 (kWh)",
    chhpMeterId: "SS302A_TxA1",
    feedInTariffColumns: [],
  },
  {
    area: "Hotel",
    rawLogicalId: "Mercury_Hotel",
    rawColumnLetter: "P",
    masterColumnHeader: "SS302A_TxA2 (kWh)",
    chhpMeterId: "SS302A_TxA2",
    feedInTariffColumns: [],
  },
  {
    area: "Hotel",
    rawLogicalId: "Mercury_Hotel",
    rawColumnLetter: "S",
    masterColumnHeader: "SS302A_TxC5 (kWh)",
    chhpMeterId: "SS302A_TxC5",
    feedInTariffColumns: ["AN"],
  },
  {
    area: "Hotel",
    rawLogicalId: "Mercury_Hotel",
    rawColumnLetter: "V",
    masterColumnHeader: "SS302B_TxB4 (kWh)",
    chhpMeterId: "SS302B_TxB4",
    feedInTariffColumns: [],
  },
  {
    area: "Hotel",
    rawLogicalId: "Mercury_Hotel",
    rawColumnLetter: "Y",
    masterColumnHeader: "SS302C_TxA3 (kWh)",
    chhpMeterId: "SS302C_TxA3",
    feedInTariffColumns: [],
  },
  {
    area: "Hotel",
    rawLogicalId: "Mercury_Hotel",
    rawColumnLetter: "AB",
    masterColumnHeader: "SS304A_TxA (kWh)",
    chhpMeterId: "SS304A_TX_A",
    feedInTariffColumns: [],
  },
  {
    area: "Hotel",
    rawLogicalId: "Mercury_Hotel",
    rawColumnLetter: "AE",
    masterColumnHeader: "SS304A_TxB (kWh)",
    chhpMeterId: "SS304A_TX_B",
    feedInTariffColumns: [],
  },
  {
    area: "Hotel",
    rawLogicalId: "Mercury_Hotel",
    rawColumnLetter: "AH",
    masterColumnHeader: "SS304B_TxC (kWh)",
    chhpMeterId: "SS304B_TX_C",
    feedInTariffColumns: [],
  },
  {
    area: "Hotel",
    rawLogicalId: "Mercury_Hotel",
    rawColumnLetter: "AK",
    masterColumnHeader: "SS304B_TxD (kWh)",
    chhpMeterId: "SS304B_TX_D",
    feedInTariffColumns: [],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "M",
    masterColumnHeader: "SS201_TxA (kWh)",
    chhpMeterId: "SS201_Tx_A",
    feedInTariffColumns: ["F", "Q", "AU"],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "P",
    masterColumnHeader: "SS201_TxB (kWh)",
    chhpMeterId: "SS201_Tx_B",
    feedInTariffColumns: ["G"],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "S",
    masterColumnHeader: "SS201_TxC (kWh)",
    chhpMeterId: "SS201_TX_C",
    feedInTariffColumns: ["H"],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "V",
    masterColumnHeader: "SS202_TxA (kWh)",
    chhpMeterId: "SS202_Tx_A",
    feedInTariffColumns: ["B", "C", "D", "E", "M"],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "Y",
    masterColumnHeader: "SS202_TxB (kWh)",
    chhpMeterId: "SS202_Tx_B",
    feedInTariffColumns: [],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "AB",
    masterColumnHeader: "SS203_TxA (kWh)",
    chhpMeterId: "SS203_Tx_A",
    feedInTariffColumns: ["I"],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "AE",
    masterColumnHeader: "SS203_TxB (kWh)",
    chhpMeterId: "SS203_Tx_B",
    feedInTariffColumns: [],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "AH",
    masterColumnHeader: "SS203_TxC (kWh)",
    chhpMeterId: "SS203_Tx_C",
    feedInTariffColumns: ["L"],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "AK",
    masterColumnHeader: "SS204_TxA (kWh)",
    chhpMeterId: "SS204_Tx_A",
    feedInTariffColumns: ["R"],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "AN",
    masterColumnHeader: "SS204_TxB (kWh)",
    chhpMeterId: "SS204_Tx_B",
    feedInTariffColumns: ["J"],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "AQ",
    masterColumnHeader: "SS206_TxA (kWh)",
    chhpMeterId: "SS206_Tx_A",
    feedInTariffColumns: ["K", "W", "AB"],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "AT",
    masterColumnHeader: "SS206_TxB (kWh)",
    chhpMeterId: "SS206_Tx_B",
    feedInTariffColumns: ["S", "T", "U", "V", "X", "Y", "Z", "AA"],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "AW",
    masterColumnHeader: "SS207_TxA (kWh)",
    chhpMeterId: "SS207_Tx_A",
    feedInTariffColumns: ["N", "O", "AR"],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "AZ",
    masterColumnHeader: "SS207_TxB (kWh)",
    chhpMeterId: "SS207_Tx_B",
    feedInTariffColumns: ["P"],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "BC",
    masterColumnHeader: "SS208_HV 11kV (kWh)",
    chhpMeterId: "SS208_HV",
    feedInTariffColumns: [],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "BF",
    masterColumnHeader: "SS208_TxA (kWh)",
    chhpMeterId: "SS208_Tx_A",
    feedInTariffColumns: ["AC", "AD", "AE", "AF"],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "BO",
    masterColumnHeader: "SS207_HV 11kV (kWh)",
    chhpMeterId: "SS221_HV",
    feedInTariffColumns: [],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "G",
    masterColumnHeader: "PTI.SS200_TxA (kWh)",
    chhpMeterId: "PTI.SS200_Tx_A",
    feedInTariffColumns: [],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "J",
    masterColumnHeader: "PTI.SS211_TxA (kWh)",
    chhpMeterId: "PTI.SS211_Tx_A",
    feedInTariffColumns: [],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "D",
    masterColumnHeader: "GLA.SS210_TxA (kWh)",
    chhpMeterId: "GLA.SS210_Tx_A",
    feedInTariffColumns: ["AS"],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "BI",
    masterColumnHeader: "SS209_TxA (kWh)",
    chhpMeterId: "SS209_TxA",
    feedInTariffColumns: [],
  },
  {
    area: "Park",
    rawLogicalId: "Mercury_Park",
    rawColumnLetter: "BL",
    masterColumnHeader: "SS209_TxB (kWh)",
    chhpMeterId: "SS209_TxB",
    feedInTariffColumns: [],
  },
];

export const POWER_SOLAR_AREA_TOTAL_HEADERS: Record<PowerSolarArea, string> = {
  CCP: "Total Power Consumption \r\nof CCP (kWh)",
  HCCP: "Total Power Consumption \r\nof HCCP (kWh)",
  Hotel: "Total Power Consumption \r\nof hotel (kWh)",
  Park: "Total Power Consumption \r\nof ThemePark (kWh)",
};

export const POWER_SOLAR_SHEET_CONFIG: Record<
  PowerSolarArea,
  { sheetName: PowerSolarArea; headerRowIndex: number }
> = {
  CCP: { sheetName: "CCP", headerRowIndex: 0 },
  HCCP: { sheetName: "HCCP", headerRowIndex: 0 },
  Hotel: { sheetName: "Hotel", headerRowIndex: 1 },
  Park: { sheetName: "Park", headerRowIndex: 0 },
};

export const MERCURY_RAW_LOGICAL_IDS: MercuryRawLogicalId[] = [
  "Mercury_CCP",
  "Mercury_HCCP",
  "Mercury_Hotel",
  "Mercury_Park",
];

/**
 * Meters included in the sheet sum but subtracted once from the area total
 * (CCP: Σ(all) − EA8; HCCP: Σ(all) − CSB).
 */
export const POWER_SOLAR_AREA_TOTAL_EXCLUDE_HEADERS: Partial<
  Record<PowerSolarArea, string[]>
> = {
  CCP: ["EA8"],
  HCCP: ["SS303B_TxD3_C12 CSB"],
};

/** Hotel sheet row 0 property groups → subtotal columns (cols 16–18). */
export const HOTEL_PROPERTY_SUBTOTALS: Array<{
  subtotalHeader: string;
  meterHeaders: string[];
}> = [
  {
    subtotalHeader: "DHH Total kWh",
    meterHeaders: [
      "SS301_TxA (kWh)",
      "SS301_TxB (kWh)",
      "SS301_TxC (kWh)",
    ],
  },
  {
    subtotalHeader: "DLH Total Sum",
    meterHeaders: [
      "SS302A_TxA1 (kWh)",
      "SS302A_TxA2 (kWh)",
      "SS302A_TxC5 (kWh)",
      "SS302B_TxB4 (kWh)",
      "SS302C_TxA3 (kWh)",
    ],
  },
  {
    subtotalHeader: "DEL Total Sum",
    meterHeaders: [
      "SS304A_TxA (kWh)",
      "SS304A_TxB (kWh)",
      "SS304B_TxC (kWh)",
      "SS304B_TxD (kWh)",
    ],
  },
];
