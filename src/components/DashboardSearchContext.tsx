"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type DashboardSearch = {
  query: string;
  setQuery: (query: string) => void;
};

const DashboardSearchContext = createContext<DashboardSearch | null>(null);

export function DashboardSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  return (
    <DashboardSearchContext.Provider value={{ query, setQuery }}>
      {children}
    </DashboardSearchContext.Provider>
  );
}

export function useDashboardSearch() {
  const value = useContext(DashboardSearchContext);
  if (!value)
    throw new Error(
      "useDashboardSearch must be used inside DashboardSearchProvider",
    );
  return value;
}
