import type { ComparisonData, DeltaTotals, EnergyTotals } from "@/lib/types";

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export function computeDelta(
  primary: EnergyTotals,
  comparison: EnergyTotals,
): DeltaTotals {
  return {
    electricity: {
      valuePct: pctChange(
        primary.electricity.value,
        comparison.electricity.value,
      ),
      costPct: pctChange(
        primary.electricity.cost,
        comparison.electricity.cost,
      ),
    },
    gas: {
      valuePct: pctChange(primary.gas.value, comparison.gas.value),
      costPct: pctChange(primary.gas.cost, comparison.gas.cost),
    },
    solar: {
      valuePct: pctChange(primary.solar.value, comparison.solar.value),
    },
  };
}

export function attachDelta(
  comparison: Omit<ComparisonData, "delta">,
  primaryTotals: EnergyTotals,
): ComparisonData {
  return {
    ...comparison,
    delta: computeDelta(primaryTotals, comparison.totals),
  };
}
