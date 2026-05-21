"use client";

import { Assignment } from "@/model/participants";

import { createContext, useContext, useState, ReactNode } from "react";

export type AssignmentSelection = Assignment | null;

interface ContextType {
  assignmentSelection: AssignmentSelection;
  selectAssignment: (assignment: Assignment) => void;
  clearAssignment: () => void;
}

export const AssignmentContext = createContext<ContextType | undefined>(
  undefined,
);

export function AssignmentProvider({ children }: { children: ReactNode }) {
  const [assignmentSelection, setAssignmentSelection] =
    useState<AssignmentSelection>(null);

  const selectAssignment = (assignment: Assignment) => {
    setAssignmentSelection(assignment);
  };

  const clearAssignment = () => setAssignmentSelection(null);

  return (
    <AssignmentContext.Provider
      value={{
        assignmentSelection,
        selectAssignment,
        clearAssignment,
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
