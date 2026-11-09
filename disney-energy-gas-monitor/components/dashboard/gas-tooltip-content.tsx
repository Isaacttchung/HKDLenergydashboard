"use client";

import { formatChartKwhValue } from "@/components/dashboard/chart-tooltip";
import { gasKwhToUnits, gasUnitsToKwh } from "@/lib/datastore/parsers/excel-utils";
import { formatNumber } from "@/lib/utils";

function formatUnits(value: number): string {
  return formatNumber(Math.round(value));
}

export function GasKwhTooltipRow({
  label,
  kwh,
  color,
}: {
  label: string;
  kwh: number;
  color?: string;
}) {
  const units = gasKwhToUnits(kwh);
  return (
    <div className="py-0.5">
      <div className="flex items-center justify-between gap-6">
        <span className="flex items-center gap-2 text-slate-700">
          {color ? (
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: color }}
            />
          ) : null}
          {label}
        </span>
        <span className="font-medium tabular-nums text-slate-900">
          {formatChartKwhValue(kwh)} kWh
        </span>
      </div>
      <p className="text-right text-xs tabular-nums text-slate-500">
        {formatUnits(units)} units
      </p>
    </div>
  );
}

export function HccpGasTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Record<string, unknown> }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const labelText = label != null ? String(label) : undefined;

  const point = payload[0]?.payload as {
    gasUnits?: number;
    ballroomUtilization?: number;
    overallOccupancyPct?: number;
    outdoorTempC?: number;
  };

  const gasUnits = Number(point?.gasUnits ?? 0);
  const gasKwh = gasUnitsToKwh(gasUnits);

  type Row = { label: string; value: string; color: string; subKwh?: string };
  const rows: Row[] = [
    {
      label: "Gas Consumption (units)",
      value: formatUnits(gasUnits),
      color: "#ea580c",
      subKwh: `${formatChartKwhValue(gasKwh)} kWh`,
    },
  ];

  if (
    point?.ballroomUtilization != null &&
    Number.isFinite(point.ballroomUtilization)
  ) {
    rows.push({
      label: "Ballroom Utilization (%)",
      value: `${formatChartKwhValue(point.ballroomUtilization)}%`,
      color: "#1e293b",
    });
  }

  if (
    point?.overallOccupancyPct != null &&
    Number.isFinite(point.overallOccupancyPct)
  ) {
    rows.push({
      label: "Overall Occupancy (%)",
      value: `${formatChartKwhValue(point.overallOccupancyPct)}%`,
      color: "#c4a574",
    });
  }

  if (point?.outdoorTempC != null && Number.isFinite(point.outdoorTempC)) {
    rows.push({
      label: "Outdoor Air Temperature (°C)",
      value: `${formatChartKwhValue(point.outdoorTempC)} °C`,
      color: "#7ab3dd",
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      {labelText ? (
        <p className="mb-2 border-b border-slate-100 pb-1.5 font-medium text-slate-900">
          {labelText}
        </p>
      ) : null}
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-2 text-slate-700">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: row.color }}
                />
                {row.label}
              </span>
              <span className="font-medium tabular-nums text-slate-900">
                {row.value}
              </span>
            </div>
            {row.subKwh ? (
              <p className="text-right text-xs tabular-nums text-slate-500">
                {row.subKwh}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function GasChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    dataKey?: string;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      {label ? (
        <p className="mb-2 border-b border-slate-100 pb-1.5 font-medium text-slate-900">
          {label}
        </p>
      ) : null}
      <div className="space-y-2">
        {payload.map((entry) => {
          const kwh = Number(entry.value ?? 0);
          if (!Number.isFinite(kwh)) return null;
          return (
            <GasKwhTooltipRow
              key={String(entry.dataKey ?? entry.name)}
              label={String(entry.name ?? "Gas")}
              kwh={kwh}
              color={entry.color}
            />
          );
        })}
      </div>
    </div>
  );
}
