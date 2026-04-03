"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Selection = {
  table: number;
  direction: "NS" | "EW";
} | null;

interface ContextType {
  selection: Selection;
  selectTable: (table: number, direction: "NS" | "EW") => void;
  clearSelection: () => void;
}

const TableContext = createContext<ContextType | undefined>(undefined);

export function TableProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>(null);

  const selectTable = (table: number, direction: "NS" | "EW") => {
    setSelection({ table, direction });
  };

  const clearSelection = () => setSelection(null);

  return (
    <TableContext.Provider value={{ selection, selectTable, clearSelection }}>
      {children}
    </TableContext.Provider>
  );
}

export function useTable() {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error("useTable must be used within TableProvider");
  return ctx;
}
