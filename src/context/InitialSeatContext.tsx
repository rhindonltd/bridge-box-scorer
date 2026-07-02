"use client";

import { Seat } from "@/model/participants";
import { createContext, useContext, ReactNode } from "react";

interface ContextType {
  initialSeat: Seat | null;
}

export const InitialSeatContext = createContext<ContextType | undefined>(
  undefined,
);

export function InitialSeatProvider({
  children,
  initialSeat,
}: {
  children: ReactNode;
  initialSeat: Seat | null;
}) {
  return (
    <InitialSeatContext.Provider value={{ initialSeat }}>
      {children}
    </InitialSeatContext.Provider>
  );
}

export function useInitialSeat() {
  const ctx = useContext(InitialSeatContext);

  if (!ctx) {
    throw new Error("useInitialSeat must be used within InitialSeatProvider");
  }

  return ctx;
}
