"use client";

const HCCP_GAS_LEGEND_ITEMS = [
  {
    label: "Gas Consumption (units)",
    color: "#ea580c",
    kind: "bar" as const,
  },
  {
    label: "Ballroom Utilization (%)",
    color: "#1e293b",
    kind: "line" as const,
  },
  {
    label: "Overall Occupancy (%)",
    color: "#c4a574",
    kind: "line" as const,
  },
  {
    label: "Outdoor Air Temperature (°C)",
    color: "#7ab3dd",
    kind: "line" as const,
  },
];

export function HccpGasLegendContent() {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-3 text-xs text-slate-700">
      {HCCP_GAS_LEGEND_ITEMS.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          {item.kind === "bar" ? (
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
          ) : (
            <span className="relative inline-flex h-2.5 w-4 shrink-0 items-center">
              <span
                className="h-0.5 w-full rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span
                className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full border bg-white"
                style={{ borderColor: item.color }}
              />
            </span>
          )}
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
