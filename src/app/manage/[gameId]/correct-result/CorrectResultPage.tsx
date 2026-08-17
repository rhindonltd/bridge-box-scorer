"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";
import { parseContract } from "@/model/contract";
import { buildPlayedContractCode } from "@/lib/buildPlayedContractCode";
import { getDirectorToken } from "@/lib/director-token";
import { SelectBoardPage } from "./SelectBoardPage";
import { BoardInstance, Traveller } from "./Traveller";
import {
  DirectorContractWizard,
  DirectorWizardResult,
} from "./DirectorContractWizard";

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

  const { game } = useGame();

  const [wizardStep, setWizardStep] = useState<WizardStep>({
    step: "selectBoard",
  });
  const [boards, setBoards] = useState<number[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [instances, setInstances] = useState<BoardInstance[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch boards when on selectBoard step
  useEffect(() => {
    if (wizardStep.step !== "selectBoard") return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag before async fetch
    setBoardsLoading(true);
    fetch(`/api/games/${game!.gameId}/boards`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setBoards(data.boards ?? []);
          setBoardsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBoards([]);
          setBoardsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [wizardStep.step, game]);

  // Fetch instances when viewing traveller
  useEffect(() => {
    if (wizardStep.step !== "viewTraveller") return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag before async fetch
    setInstancesLoading(true);
    fetch(`/api/games/${game!.gameId}/boards/${wizardStep.boardNumber}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setInstances(data.instances ?? []);
          setInstancesLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInstances([]);
          setInstancesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [wizardStep, game]);

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
        `/api/games/${game!.gameId}/boards/${boardNumber}/override`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roundNumber,
            tableNumber,
            result,
            directorToken: getDirectorToken(game!.gameId),
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

  if (!game) return null;

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
