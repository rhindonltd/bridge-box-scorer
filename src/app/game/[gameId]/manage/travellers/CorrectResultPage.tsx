"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRequiredGame } from "@/context/GameContext";
import { parseContract } from "@/model/contract";
import { buildPlayedContractCode } from "@/lib/buildPlayedContractCode";
import { getDirectorToken } from "@/lib/director-token";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import { SelectBoardPage } from "@/app/game/[gameId]/manage/travellers/SelectBoardPage";
import { Traveller } from "./Traveller";
import {
  DirectorContractWizard,
  DirectorWizardResult,
} from "./DirectorContractWizard";
import { BoardInstance } from "@/model/participants";

interface CorrectResultPageProps {
  onResultCorrected: () => void;
}

export function CorrectResultPage({
  onResultCorrected,
}: CorrectResultPageProps) {
  type WizardStep =
    | { step: "selectBoard" }
    | { step: "viewTraveller"; boardNumber: number }
    | {
        step: "enterContract";
        boardNumber: number;
        roundNumber: number;
        tableNumber: number;
      }
    | { step: "saving" };

  const { game } = useRequiredGame();

  const [wizardStep, setWizardStep] = useState<WizardStep>({
    step: "selectBoard",
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch the board list only while on the selectBoard step.
  const { data: boardsData, isLoading: boardsLoading } = useSWR<{
    boards: number[];
  }>(
    wizardStep.step === "selectBoard" ? swrKeys.boards(game.gameId) : null,
    fetcher,
  );
  const boards = boardsData?.boards ?? [];

  // Fetch board instances only while viewing a traveller.
  const { data: instancesData, isLoading: instancesLoading } = useSWR<{
    instances: BoardInstance[];
  }>(
    wizardStep.step === "viewTraveller"
      ? swrKeys.boardInstances(game.gameId, wizardStep.boardNumber)
      : null,
    fetcher,
  );
  const instances = instancesData?.instances ?? [];

  function handleBoardSelected(boardNumber: number) {
    setWizardStep({ step: "viewTraveller", boardNumber });
  }

  function handleLineSelected(instance: BoardInstance) {
    setWizardStep({
      step: "enterContract",
      boardNumber: instance.boardNumber,
      roundNumber: instance.roundNumber,
      tableNumber: instance.tableNumber,
    });
  }

  function handleWizardComplete(data: DirectorWizardResult) {
    if (wizardStep.step !== "enterContract") return;

    if (data.type === "adjusted") {
      saveOverride(
        wizardStep.roundNumber,
        wizardStep.tableNumber,
        wizardStep.boardNumber,
        `A${data.nsPercent}/${data.ewPercent}`,
      );
      return;
    }

    const { contract, result } = data;

    if (contract === "PO" || contract === "NP") {
      saveOverride(
        wizardStep.roundNumber,
        wizardStep.tableNumber,
        wizardStep.boardNumber,
        contract,
      );
      return;
    }

    const parsed = parseContract(contract);
    const fullResult = buildPlayedContractCode(
      parsed.level,
      parsed.suit,
      parsed.doubling,
      parsed.declarer,
      result,
    );

    saveOverride(
      wizardStep.roundNumber,
      wizardStep.tableNumber,
      wizardStep.boardNumber,
      fullResult,
    );
  }

  async function saveOverride(
    roundNumber: number,
    tableNumber: number,
    boardNumber: number,
    result: string,
  ) {
    setWizardStep({ step: "saving" });
    setError(null);

    try {
      const res = await fetch(
        `/api/games/${game.gameId}/boards/${boardNumber}/override`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roundNumber,
            tableNumber,
            result,
            directorToken: getDirectorToken(game.gameId),
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save override");
        setWizardStep({ step: "selectBoard" });
        return;
      }

      onResultCorrected();
    } catch {
      setError("Network error. Please try again.");
      setWizardStep({ step: "selectBoard" });
    }
  }

  switch (wizardStep.step) {
    case "selectBoard":
      return (
        <>
          {error && (
            <div className="bg-red-100 text-red-700 px-4 py-2 text-center text-sm">
              {error}
            </div>
          )}
          <SelectBoardPage
            boards={boards}
            isLoading={boardsLoading}
            onBoardSelected={handleBoardSelected}
          />
        </>
      );

    case "viewTraveller":
      return (
        <Traveller
          boardNumber={wizardStep.boardNumber}
          instances={instances}
          isLoading={instancesLoading}
          onLineSelected={handleLineSelected}
          onBack={() => setWizardStep({ step: "selectBoard" })}
        />
      );

    case "enterContract":
      return (
        <DirectorContractWizard
          boardNumber={wizardStep.boardNumber}
          round={wizardStep.roundNumber}
          table={wizardStep.tableNumber}
          leadCardRequired={game.leadCardRequired}
          onComplete={handleWizardComplete}
          onBack={() =>
            setWizardStep({
              step: "viewTraveller",
              boardNumber: wizardStep.boardNumber,
            })
          }
        />
      );

    case "saving":
      return (
        <div className="min-h-dvh flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            <span className="text-gray-600">Saving override...</span>
          </div>
        </div>
      );
  }
}
