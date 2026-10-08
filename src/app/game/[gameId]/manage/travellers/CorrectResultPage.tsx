"use client";

import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import useSWR from "swr";
import { useRequiredGame } from "@/context/GameContext";
import { parseContract } from "@/model/contract";
import { buildPlayedContractCode } from "@/lib/buildPlayedContractCode";
import {
  buildAdjustedScore,
  buildWeightedScore,
} from "@/model/adjusted-score";
import { TeamsRemovalFault } from "@/model/teams-removed-board";
import { VoidCause } from "@/model/teams-match-void";
import { PairsVoidCause } from "@/model/pairs-match-void";
import {
  MismatchSide,
  MismatchDirection,
  MismatchFault,
} from "@/model/swiss-mismatch";
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
  const { instances, deal, teamMatches, isLoading } = useTravellerContext();

  return (
    <Traveller
      boardNumber={boardNumber}
      instances={instances}
      deal={deal}
      teamMatches={teamMatches}
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

  // The §3.3.7 board-removal and §3.3.6/§3.3.9 void rulings apply to every teams
  // game. Board-comparison teams (BAM/PAB) score the indemnity in board-win
  // units rather than IMPs/VP, so the ruling steps adapt their wording.
  const allowTeamsRulings = game.gameType === "TEAMS";
  const boardComparison =
    game.scoringType === "BAM" || game.scoringType === "PAB";

  // The §3.3.8/§3.3.9 pairs void applies to Swiss Pairs (scored by VP), where a
  // voided match is removed from the field and each pair gets an AVE
  // compensation.
  const allowPairsVoid =
    game.gameType === "PAIRS" && game.eventFormat === "SWISS";

  // The §3.5 mismatch ruling applies to any SWISS game (pairs or teams), where
  // a wrong draw can pit a contestant against the wrong-strength opponents. The
  // step labels sides as teams rather than pairs for a teams game.
  const allowMismatch = game.eventFormat === "SWISS";
  const teamsMismatch = game.gameType === "TEAMS";

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
    // Defensive type-narrowing guard. `handleWizardComplete` is only ever wired
    // to the wizard rendered in the "enterContract" state, so this early return
    // is unreachable in practice but required to narrow the union below.
    /* v8 ignore next */
    if (wizardStep.step !== "enterContract") return;

    if (data.type === "adjusted") {
      saveOverride(
        wizardStep.roundNumber,
        wizardStep.tableNumber,
        wizardStep.boardNumber,
        buildAdjustedScore(data.nsPercent, data.ewPercent),
      );
      return;
    }

    if (data.type === "weighted") {
      saveOverride(
        wizardStep.roundNumber,
        wizardStep.tableNumber,
        wizardStep.boardNumber,
        buildWeightedScore(data.components),
      );
      return;
    }

    if (data.type === "cancel") {
      saveCancel(
        wizardStep.roundNumber,
        wizardStep.tableNumber,
        wizardStep.boardNumber,
        buildAdjustedScore(data.nsPercent, data.ewPercent),
      );
      return;
    }

    if (data.type === "removeTeams") {
      saveRemoveTeams(
        wizardStep.roundNumber,
        wizardStep.tableNumber,
        wizardStep.boardNumber,
        data.fault,
      );
      return;
    }

    if (data.type === "voidMatch") {
      saveVoidMatch(
        wizardStep.roundNumber,
        wizardStep.tableNumber,
        wizardStep.boardNumber,
        data.cause,
      );
      return;
    }

    if (data.type === "voidPairs") {
      saveVoidPairs(
        wizardStep.roundNumber,
        wizardStep.tableNumber,
        wizardStep.boardNumber,
        data.cause,
      );
      return;
    }

    if (data.type === "mismatch") {
      saveMismatch(
        wizardStep.roundNumber,
        wizardStep.tableNumber,
        wizardStep.boardNumber,
        data.side,
        data.direction,
        data.fault,
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

  async function saveCancel(
    roundNumber: number,
    tableNumber: number,
    boardNumber: number,
    result: string,
  ) {
    setWizardStep({ step: "saving" });
    setError(null);

    try {
      await emitWithAck(SocketEvents.CANCEL_BOARD_TRAVELLER, {
        gameId: game.gameId,
        directorToken: getDirectorToken(game.gameId),
        boardNumber,
        roundNumber,
        tableNumber,
        result,
      });

      onResultCorrected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel board");
      setWizardStep({ step: "selectBoard" });
    }
  }

  async function saveRemoveTeams(
    roundNumber: number,
    tableNumber: number,
    boardNumber: number,
    fault: TeamsRemovalFault,
  ) {
    setWizardStep({ step: "saving" });
    setError(null);

    try {
      await emitWithAck(SocketEvents.REMOVE_TEAMS_BOARD_TRAVELLER, {
        gameId: game.gameId,
        directorToken: getDirectorToken(game.gameId),
        boardNumber,
        roundNumber,
        tableNumber,
        fault,
      });

      onResultCorrected();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove teams board",
      );
      setWizardStep({ step: "selectBoard" });
    }
  }

  async function saveVoidMatch(
    roundNumber: number,
    tableNumber: number,
    boardNumber: number,
    cause: VoidCause,
  ) {
    setWizardStep({ step: "saving" });
    setError(null);

    try {
      await emitWithAck(SocketEvents.VOID_TEAMS_MATCH_TRAVELLER, {
        gameId: game.gameId,
        directorToken: getDirectorToken(game.gameId),
        boardNumber,
        roundNumber,
        tableNumber,
        cause,
      });

      onResultCorrected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to void match");
      setWizardStep({ step: "selectBoard" });
    }
  }

  async function saveVoidPairs(
    roundNumber: number,
    tableNumber: number,
    boardNumber: number,
    cause: PairsVoidCause,
  ) {
    setWizardStep({ step: "saving" });
    setError(null);

    try {
      await emitWithAck(SocketEvents.VOID_PAIRS_MATCH_TRAVELLER, {
        gameId: game.gameId,
        directorToken: getDirectorToken(game.gameId),
        boardNumber,
        roundNumber,
        tableNumber,
        cause,
      });

      onResultCorrected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to void match");
      setWizardStep({ step: "selectBoard" });
    }
  }

  async function saveMismatch(
    roundNumber: number,
    tableNumber: number,
    boardNumber: number,
    side: MismatchSide,
    direction: MismatchDirection,
    fault: MismatchFault,
  ) {
    setWizardStep({ step: "saving" });
    setError(null);

    try {
      await emitWithAck(SocketEvents.MISMATCH_TRAVELLER, {
        gameId: game.gameId,
        directorToken: getDirectorToken(game.gameId),
        boardNumber,
        roundNumber,
        tableNumber,
        side,
        direction,
        fault,
      });

      onResultCorrected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark mismatch");
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
          allowTeamsRulings={allowTeamsRulings}
          boardComparison={boardComparison}
          allowPairsVoid={allowPairsVoid}
          allowMismatch={allowMismatch}
          teamsMismatch={teamsMismatch}
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
            <Spinner />
            <span className="text-gray-600">Saving override...</span>
          </div>
        </div>
      );
  }
}
