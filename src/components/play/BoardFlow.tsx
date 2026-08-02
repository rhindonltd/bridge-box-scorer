"use client";

import { useState } from "react";
import { BoardResult } from "./BoardResult";
import { OpeningLead } from "./OpeningLead";
import { TabletCombinedEntry } from "./TabletCombinedEntry";
import { Card } from "@/model/common";
import type { ContractCode } from "@/model/contract";
import type { SpecialBoardOutcome } from "@/model/result";

type Props = {
  board: number;
  contract: string;
  declarer: string;

  openingLead: boolean;

  // New props for tablet layout
  round: number;
  table: number;
  roundBoards: number[];
  leadCardRequired: boolean;

  onComplete: (data: {
    result: number;
    lead: Card | null;
    contract?: string;
  }) => void;
};

type Step = "result" | "lead";

export function BoardFlow({
  board,
  contract,
  declarer,
  onComplete,
  openingLead,
  round,
  table,
  roundBoards,
  leadCardRequired,
}: Props) {
  const [step, setStep] = useState<Step>("result");

  const [result, setResult] = useState<number | null>(null);

  function handleResultSave(value: number) {
    // If no lead step required → finish immediately
    if (!openingLead) {
      onComplete({
        result: value,
        lead: null,
      });
      return;
    }

    setResult(value);
    setStep("lead");
  }

  function handleLeadSave(value: Card | null) {
    onComplete({
      result: result ?? 0,
      lead: value,
    });
  }

  function handleTabletComplete(data: {
    contract: ContractCode | SpecialBoardOutcome;
    result: number;
    lead: Card | null;
  }) {
    // The tablet sends contract + result + lead in one shot.
    // Pass all three to the parent — contract is optional on the callback
    // since on mobile the parent already knows the contract from a prior step.
    onComplete({
      result: data.result,
      lead: data.lead,
      contract: data.contract,
    });
  }

  return (
    <>
      {/* Mobile: existing multi-step flow */}
      <div className="md:hidden">
        {step === "result" && (
          <BoardResult
            board={board}
            contract={contract}
            declarer={declarer}
            onSave={handleResultSave}
          />
        )}

        {/* Lead step only exists if required */}
        {step === "lead" && openingLead && (
          <OpeningLead onSave={handleLeadSave} />
        )}
      </div>

      {/* Tablet: combined single-screen */}
      <div className="hidden md:flex md:flex-col flex-1">
        <TabletCombinedEntry
          round={round}
          table={table}
          roundBoards={roundBoards}
          leadCardRequired={leadCardRequired}
          onComplete={handleTabletComplete}
        />
      </div>
    </>
  );
}
