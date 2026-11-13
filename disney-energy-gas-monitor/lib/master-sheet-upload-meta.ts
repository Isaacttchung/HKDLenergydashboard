export interface MasterSheetUploadMeta {
  latestDate: string | null;
  earliestDate: string | null;
  /** Mode C only updates JSON sidecars — refetch client data, skip RSC refresh. */
  skipServerRefresh?: boolean;
}
