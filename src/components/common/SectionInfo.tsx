"use client";

import { useGame } from "@/context/GameSelectionContext";
import React from "react";

export function SectionInfo() {
  const { selection } = useGame();

  // 👇 render nothing if no selection
  if (!selection) return null;

  return (
    <div className="flex flex-col bg-blue-200 py-2">
      <div className="text-center font-bold">
        <span>{selection.eventName}</span>
      </div>

      {(selection.sessionName || selection.sectionName) && (
        <div className="text-center font-bold">
          {selection.sessionName && <span>{selection.sessionName}</span>}
          {selection.sessionName && selection.sectionName && <span>, </span>}
          {selection.sectionName && <span>{selection.sectionName}</span>}
        </div>
      )}
    </div>
  );
}
