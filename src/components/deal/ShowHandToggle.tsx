"use client";

import { useState } from "react";
import { Deal } from "@/model/common";
import { DealDisplay } from "./DealDisplay";

/**
 * A "Show hand" toggle that reveals the board's deal (hand diagram) on demand.
 *
 * The deal view is off by default so it never clutters the traveller / results
 * table. When no deal has been entered for the board there is nothing to show,
 * so the toggle renders nothing at all. Shared by both traveller surfaces (the
 * player board-results page and the director correction traveller).
 */
export function ShowHandToggle({
  boardNumber,
  deal,
}: {
  boardNumber: number;
  deal: Deal | null;
}) {
  const [shown, setShown] = useState(false);

  if (!deal) return null;

  return (
    <div className="my-3">
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-expanded={shown}
        data-testid="show-hand-toggle"
        className="text-sm font-medium text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
      >
        {shown ? "Hide hand" : "Show hand"}
      </button>

      {shown && (
        <div className="mt-2">
          <DealDisplay boardNumber={boardNumber} deal={deal} />
        </div>
      )}
    </div>
  );
}
