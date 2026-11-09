"use client";

import { CustomGraphWorkspace } from "@/components/dashboard/custom-graph/custom-graph-workspace";
import { useCustomGraphSession } from "@/components/dashboard/custom-graph/custom-graph-session";

interface CustomGraphWorkspaceHostProps {
  queryString: string;
  timePreset: string;
  customRangeReady: boolean;
}

/** Keeps the workspace mounted so graphs survive tab changes until Reset. */
export function CustomGraphWorkspaceHost({
  queryString,
  timePreset,
  customRangeReady,
}: CustomGraphWorkspaceHostProps) {
  const { modalOpen, setModalOpen } = useCustomGraphSession();

  return (
    <CustomGraphWorkspace
      open={modalOpen}
      onOpenChange={setModalOpen}
      queryString={queryString}
      timePreset={timePreset}
      customRangeReady={customRangeReady}
    />
  );
}
