"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRequiredGame } from "@/context/GameContext";
import { parseContract } from "@/model/contract";
import { buildPlayedContractCode } from "@/lib/buildPlayedContractCode";
import { getDirectorToken } from "@/lib/director-token";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import { emitWithAck } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { SelectBoardPage } from "@/app/game/[gameId]/manage/travellers/SelectBoardPage";
import { Traveller } from "./Traveller";
import {
  TravellerProvider,
  useTravellerContext,
} from "@/context/TravellerContext";
import {
  DirectorContractWizard,
  DirectorWizardResult,
} from "./DirectorContractWizard";
import { BoardInstance } from "@/model/participants";

interface CorrectResultPageProps {
  onResultCorrected: () => void;
}

/**
 * The traveller view for the correction wizard. Reads the board's instances
 * live from the shared traveller context (same data path as the display /
 * play-page traveller), so a director's own override — or a concurrent result —
 * updates the list without a refetch.
 */
function CorrectResultTraveller({
  boardNumber,
  onLineSelected,
  onBack,
}: {
  boardNumber: number;
  onLineSelected: (instance: BoardInstance) => void;
  onBack: () => void;
}) {
  const { instances, isLoading } = useTravellerContext();

  return (
    <Traveller
      boardNumber={boardNumber}
      instances={instances}
      isLoading={isLoading}
      onLineSelected={onLineSelected}
      onBack={onBack}
    />
  );
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

  // The board list is a property of the movement (1..highest board in play),
  // effectively static once the movement is set, so it stays on HTTP/SWR.
  const { data: boardsData, isLoading: boardsLoading } = useSWR<{
    boards: number[];
  }>(
    wizardStep.step === "selectBoard" ? swrKeys.boards(game.gameId) : null,
    fetcher,
  );
  const boards = boardsData?.boards ?? [];

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
      await emitWithAck(SocketEvents.OVERRIDE_RESULT_TRAVELLER, {
        gameId: game.gameId,
        directorToken: getDirectorToken(game.gameId),
        boardNumber,
        roundNumber,
        tableNumber,
        result,
      });

      onResultCorrected();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save override",
      );
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
        <TravellerProvider boardNumber={wizardStep.boardNumber}>
          <CorrectResultTraveller
            boardNumber={wizardStep.boardNumber}
            onLineSelected={handleLineSelected}
            onBack={() => setWizardStep({ step: "selectBoard" })}
          />
        </TravellerProvider>
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
