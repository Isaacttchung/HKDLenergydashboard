import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import * as XLSX from "xlsx";
import { dailyReportDateFromEmsBatchDataDate } from "@/lib/hkdl-daily-report-date";
import { updatePowerSolarContextColumns } from "@/lib/raw-to-master/power-solar-context";

const MASTER =
  "/workspace/disney-energy-gas-monitor-b0035ee/data/master-sheets/HKDL_Power_Solar_consumption_report.xlsx";

test("dailyReportDateFromEmsBatchDataDate matches Timestamp day", () => {
  assert.equal(
    dailyReportDateFromEmsBatchDataDate("2026-11-08"),
    "2026-11-08",
  );
});

test("updatePowerSolarContextColumns writes O,Y,Z and formulas P,AA,AB", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ps-ctx-"));
  const masterPath = path.join(dir, "power-solar.xlsx");
  await copyFile(MASTER, masterPath);

  await updatePowerSolarContextColumns(masterPath, {
    dataDate: "2026-11-20",
    outdoorAirTempC: 26.5,
    overallOccupancy: 58.1,
    atten: 22,
  });

  const wb = XLSX.read(await readFile(masterPath), { cellFormula: true });
  const hotel = wb.Sheets.Hotel!;
  const park = wb.Sheets.Park!;
  let hotelR = 0;
  let parkR = 0;
  for (let r = 2; r < 5000; r++) {
    const a = hotel["A" + (r + 1)];
    if (!a) break;
    if (
      a.t === "n" &&
      XLSX.SSF.parse_date_code(a.v)?.y === 2026 &&
      XLSX.SSF.parse_date_code(a.v)?.m === 11 &&
      XLSX.SSF.parse_date_code(a.v)?.d === 20
    ) {
      hotelR = r + 1;
      break;
    }
  }
  for (let r = 1; r < 5000; r++) {
    const a = park["A" + (r + 1)];
    if (!a) break;
    if (
      a.t === "n" &&
      XLSX.SSF.parse_date_code(a.v)?.y === 2026 &&
      XLSX.SSF.parse_date_code(a.v)?.m === 11 &&
      XLSX.SSF.parse_date_code(a.v)?.d === 20
    ) {
      parkR = r + 1;
      break;
    }
  }
  assert.ok(hotelR > 0 && parkR > 0);
  assert.equal(hotel["O" + hotelR]?.v, 58.1);
  assert.match(hotel["P" + hotelR]?.f ?? "", /AND\(A\d+/);
  assert.equal(park["Y" + parkR]?.v, 26.5);
  assert.equal(park["Z" + parkR]?.v, 22);
  assert.match(park["AA" + parkR]?.f ?? "", /IF\(Z/);
  assert.match(park["AB" + parkR]?.f ?? "", /AND\(A\d+/);

  await rm(dir, { recursive: true, force: true });
});
