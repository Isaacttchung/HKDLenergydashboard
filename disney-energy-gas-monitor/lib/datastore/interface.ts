import type { SolarInstallationIndex } from "@/lib/solar-installations/aggregate";
import type { EnergyRecord } from "@/lib/types";

export interface IDataStore {
  getRecords(): Promise<EnergyRecord[]>;
  getSolarInstallationIndex(): Promise<SolarInstallationIndex>;
}
