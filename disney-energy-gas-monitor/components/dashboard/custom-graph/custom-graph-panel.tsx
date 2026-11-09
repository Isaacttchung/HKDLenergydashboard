"use client";

import { useCustomGraphSession } from "@/components/dashboard/custom-graph/custom-graph-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "lucide-react";

export function CustomGraphPanel() {
  const { graphs, setModalOpen } = useCustomGraphSession();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChart className="h-5 w-5 text-brand-muted" />
          Custom graph
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600">
        <p>
          Build your own time-series charts from resort electricity, gas, solar,
          weather, and occupancy data. Graphs are kept until you click{" "}
          <strong className="font-medium text-slate-700">Reset graphs</strong>,
          even if you switch to another tab and come back.
        </p>
        {graphs.length > 0 && (
          <p className="text-xs font-medium text-brand-foreground">
            {graphs.length} saved graph{graphs.length === 1 ? "" : "s"} in this session
          </p>
        )}
        <Button type="button" onClick={() => setModalOpen(true)}>
          Build/view custom graphs
        </Button>
      </CardContent>
    </Card>
  );
}
