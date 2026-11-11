/** RawData row ids that feed the Sum CCP1 (`aggregate300`) calculation on raw upload. */
export const SUM_CCP1_SUMMAND_RAW_DATA_ROWS = [
  147, 148, 149, 150, 151, 152,
] as const;

export const SUM_CCP1_SUBTRAHEND_RAW_DATA_ROW = 153;

export const SUM_CCP1_FEED_RAW_DATA_ROWS = [
  ...SUM_CCP1_SUMMAND_RAW_DATA_ROWS,
  SUM_CCP1_SUBTRAHEND_RAW_DATA_ROW,
] as const;

export function rowFeedsSumCcp1Aggregate(
  rawDataRow: number | undefined,
): boolean {
  if (rawDataRow === undefined) return false;
  return (SUM_CCP1_FEED_RAW_DATA_ROWS as readonly number[]).includes(rawDataRow);
}
