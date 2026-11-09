"use client";

interface TooltipEntry {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
}

interface CustomGraphTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}

export function CustomGraphTooltip({
  active,
  payload,
  label,
}: CustomGraphTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className="pointer-events-none min-w-[160px] rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-lg"
      style={{ zIndex: 1000 }}
    >
      <p className="mb-1.5 text-xs font-semibold text-slate-900">{label}</p>
      <ul className="space-y-1">
        {payload.map((entry) => {
          const color = entry.color ?? "#64748b";
          const value =
            typeof entry.value === "number"
              ? entry.value.toLocaleString()
              : String(entry.value ?? "—");
          return (
            <li
              key={String(entry.dataKey)}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <span className="font-medium text-slate-700">{entry.name}:</span>
              <span className="text-slate-800">{value}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
