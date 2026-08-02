"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { SelectBoardPage } from "@/components/pages/manage/correct-result/SelectBoardPage";
import { BoardInstance } from "@/components/pages/manage/correct-result/SelectInstancePage";
import { TravellerView } from "@/components/pages/manage/correct-result/TravellerView";
import ContractEntryPanel from "@/components/contract/ContractEntryPanel";
import { BoardResult } from "@/components/play/BoardResult";
import { buildPlayedContractCode } from "@/lib/buildPlayedContractCode";
import { getDirectorToken } from "@/lib/director-token";
import { ContractCode, isContractCode, parseContract } from "@/model/contract";
import { SpecialBoardOutcome } from "@/model/result";

type WizardStep =
  | { step: "selectBoard" }
  | { step: "viewTraveller"; boardNumber: number }
  | {
      step: "enterContract";
      boardNumber: number;
      roundNumber: number;
      tableNumber: number;
    }
  | {
      step: "enterResult";
      boardNumber: number;
      roundNumber: number;
      tableNumber: number;
      contract: ContractCode;
    }
  | { step: "saving" };

export default function CorrectResultPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const gameId = params.id;
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
    if (wizardStep.step === "selectBoard") {
      setBoardsLoading(true);
      fetch(`/api/games/${gameId}/boards`)
        .then((r) => r.json())
        .then((data) => {
          setBoards(data.boards ?? []);
          setBoardsLoading(false);
        })
        .catch(() => {
          setBoards([]);
          setBoardsLoading(false);
        });
    }
  }, [wizardStep.step, gameId]);

  // Fetch instances when viewing traveller
  useEffect(() => {
    if (wizardStep.step === "viewTraveller") {
      setInstancesLoading(true);
      fetch(`/api/games/${gameId}/boards/${wizardStep.boardNumber}`)
        .then((r) => r.json())
        .then((data) => {
          setInstances(data.instances ?? []);
          setInstancesLoading(false);
        })
        .catch(() => {
          setInstances([]);
          setInstancesLoading(false);
        });
    }
  }, [wizardStep, gameId]);

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

  function handleContractEntered(contract: ContractCode | SpecialBoardOutcome) {
    if (wizardStep.step !== "enterContract") return;

    if (contract === "PO" || contract === "NP") {
      saveOverride(
        wizardStep.roundNumber,
        wizardStep.tableNumber,
        wizardStep.boardNumber,
        contract,
      );
      return;
    }

    if (isContractCode(contract)) {
      setWizardStep({
        step: "enterResult",
        boardNumber: wizardStep.boardNumber,
        roundNumber: wizardStep.roundNumber,
        tableNumber: wizardStep.tableNumber,
        contract,
      });
    }
  }

  function handleResultEntered(trickResult: number) {
    if (wizardStep.step !== "enterResult") return;

    const parsed = parseContract(wizardStep.contract);
    const fullResult = buildPlayedContractCode(
      parsed.level,
      parsed.suit,
      parsed.doubling,
      parsed.declarer,
      trickResult,
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
        `/api/games/${gameId}/boards/${boardNumber}/override`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roundNumber,
            tableNumber,
            result,
            directorToken: getDirectorToken(gameId),
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save override");
        setWizardStep({ step: "selectBoard" });
        return;
      }

      router.replace(`/manage/${gameId}/menu`);
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
        <TravellerView
          boardNumber={wizardStep.boardNumber}
          instances={instances}
          isLoading={instancesLoading}
          gameType={game.gameType}
          onLineSelected={handleLineSelected}
          onBack={() => setWizardStep({ step: "selectBoard" })}
        />
      );

    case "enterContract":
      return (
        <ContractEntryPanel
          headerText={`Correcting Board ${wizardStep.boardNumber}`}
          subHeaderText={`Table ${wizardStep.tableNumber}, Round ${wizardStep.roundNumber}`}
          onOk={handleContractEntered}
        />
      );

    case "enterResult": {
      const parsed = parseContract(wizardStep.contract);
      const contractDisplay = `${parsed.level}${parsed.suit}${parsed.doubling}`;
      return (
        <BoardResult
          board={wizardStep.boardNumber}
          contract={contractDisplay}
          declarer={parsed.declarer}
          onSave={handleResultEntered}
        />
      );
    }

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
