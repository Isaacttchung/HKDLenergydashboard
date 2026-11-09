"use client";

import type { CustomGraphChartPayload } from "@/lib/custom-graph/types";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface CustomGraphSlot {
  id: string;
  seriesIds: string[];
  chart: CustomGraphChartPayload;
}

interface CustomGraphSessionContextValue {
  graphs: CustomGraphSlot[];
  showPicker: boolean;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  setShowPicker: (show: boolean) => void;
  addGraph: (slot: CustomGraphSlot) => void;
  resetGraphs: () => void;
}

const CustomGraphSessionContext =
  createContext<CustomGraphSessionContextValue | null>(null);

export function CustomGraphSessionProvider({ children }: { children: ReactNode }) {
  const [graphs, setGraphs] = useState<CustomGraphSlot[]>([]);
  const [showPicker, setShowPicker] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const addGraph = useCallback((slot: CustomGraphSlot) => {
    setGraphs((prev) => [...prev, slot]);
    setShowPicker(false);
  }, []);

  const resetGraphs = useCallback(() => {
    setGraphs([]);
    setShowPicker(true);
  }, []);

  const value = useMemo(
    () => ({
      graphs,
      showPicker,
      modalOpen,
      setModalOpen,
      setShowPicker,
      addGraph,
      resetGraphs,
    }),
    [graphs, showPicker, modalOpen, addGraph, resetGraphs],
  );

  return (
    <CustomGraphSessionContext.Provider value={value}>
      {children}
    </CustomGraphSessionContext.Provider>
  );
}

export function useCustomGraphSession(): CustomGraphSessionContextValue {
  const ctx = useContext(CustomGraphSessionContext);
  if (!ctx) {
    throw new Error(
      "useCustomGraphSession must be used within CustomGraphSessionProvider",
    );
  }
  return ctx;
}
