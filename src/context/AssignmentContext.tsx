"use client";

import { Assignment, Seat } from "@/model/participants";

import { createContext, useContext, useState, ReactNode } from "react";

interface ContextType {
  assignment: Assignment | null;
}

export const AssignmentContext = createContext<ContextType | undefined>(
  undefined,
);

export function AssignmentProvider({
  gameId,
  initialSeat,
  children,
}: {
  gameId: string;
  initialSeat: Seat;
  children: ReactNode;
}) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);

  return (
    <AssignmentContext.Provider
      value={{
        assignment,
      }}
    >
      {children}
    </AssignmentContext.Provider>
  );
}

export function useAssignment() {
  const ctx = useContext(AssignmentContext);

  if (!ctx) {
    throw new Error("useAssignment must be used within AssignmentProvider");
  }

  return ctx;
}
