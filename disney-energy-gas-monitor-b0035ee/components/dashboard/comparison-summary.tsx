"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { ComparisonData } from "@/lib/types";

interface ComparisonSummaryProps {
  comparison: ComparisonData;
}

export function ComparisonSummary({ comparison }: ComparisonSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparison Summary</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-sm text-slate-500">Electricity</p>
          <p className="text-lg font-semibold">
            {comparison.delta.electricity.valuePct >= 0 ? "+" : ""}
            {formatNumber(comparison.delta.electricity.valuePct, 1)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Gas</p>
          <p className="text-lg font-semibold">
            {comparison.delta.gas.valuePct >= 0 ? "+" : ""}
            {formatNumber(comparison.delta.gas.valuePct, 1)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Solar</p>
          <p className="text-lg font-semibold">
            {comparison.delta.solar.valuePct >= 0 ? "+" : ""}
            {formatNumber(comparison.delta.solar.valuePct, 1)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
