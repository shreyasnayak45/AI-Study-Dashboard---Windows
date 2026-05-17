"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { User, UserProfile, UserSettings } from "@/types";

interface DashboardData {
  user: User;
  profile: UserProfile | null;
  settings: UserSettings | null;
}

const DashboardDataContext = createContext<DashboardData | null>(null);

export function DashboardDataProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: DashboardData;
}) {
  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const value = useContext(DashboardDataContext);

  if (!value) {
    throw new Error("useDashboardData must be used inside DashboardDataProvider.");
  }

  return value;
}
