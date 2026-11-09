/** External link index in Formula-DailyWeb4.xlsm → upload logical id (26-file set). */
export const TOP10_LINK_ID_TO_LOGICAL_ID: Record<number, string> = {
  1: "Mercury_CCP",
  6: "SS200_TxA_1",
  7: "SS201_TxA_1",
  8: "SS201_TxB_1",
  9: "SS201_TxC_1",
  10: "SS202_TxA_1",
  11: "SS202_TxB_1",
  12: "SS203_TxA_1",
  13: "SS203_TxB_1",
  14: "SS203_TxC_1",
  15: "SS204_TxA_1",
  16: "SS204_TxB_1",
  17: "SS206_TxA_1",
  18: "SS206_TxB_1",
  19: "SS207_TxA",
  20: "SS207_TxB",
  21: "SS208_TxA_HV",
  22: "SS210_TxA_1",
  23: "SS211_TxA_1",
  24: "SS221_HV",
  25: "209-MeterB",
  26: "209-121-126",
};

export function logicalIdForTop10Link(linkId: number): string {
  const id = TOP10_LINK_ID_TO_LOGICAL_ID[linkId];
  if (!id) {
    throw new Error(`Unknown RawData external link id ${linkId}`);
  }
  return id;
}
