import { Suspense } from "react";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import {
  getDailyContext,
  getEarliestDataDate,
  getLatestDataDate,
} from "@/lib/daily-context";
import { getEnergyData } from "@/lib/energy-service";
import { getAllRelations } from "@/lib/relations";
import { getBuildings, getGroups } from "@/lib/taxonomy";
import {
  capSelectableMaxDate,
  DATA_MIN_DATE,
} from "@/lib/time-presets";

export const dynamic = "force-dynamic";

const FALLBACK_DATE = "2026-09-13";

async function DashboardWithData() {
  const [latestRaw, earliestRaw] = await Promise.all([
    getLatestDataDate(),
    getEarliestDataDate(),
  ]);
  const latestDate = capSelectableMaxDate(latestRaw ?? FALLBACK_DATE);
  const dataMinDate = earliestRaw ?? DATA_MIN_DATE;

  const [initialData, initialDailyContext] = await Promise.all([
    getEnergyData({
      timePreset: "day",
      from: latestDate,
      to: latestDate,
      metric: "compare",
    }),
    getDailyContext(latestDate),
  ]);

  return (
    <DashboardPage
      initialBuildings={getBuildings()}
      initialGroups={getGroups()}
      initialRelations={getAllRelations()}
      initialData={initialData}
      initialDailyContext={initialDailyContext}
      defaultDate={latestDate}
      dataMinDate={dataMinDate}
      dataMaxDate={latestDate}
    />
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-brand-light px-4 text-center text-brand">
          <p className="font-medium">Loading dashboard…</p>
          <p className="max-w-sm text-sm text-slate-600">
            The first load after starting the server can take up to a minute while
            master Excel sheets are read.
          </p>
        </div>
      }
    >
      <DashboardWithData />
    </Suspense>
  );
}
