"use client";

import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import useSWR from "swr";
import { useRequiredGame } from "@/context/GameContext";
import { parseContract, ContractCode } from "@/model/contract";
import { SpecialBoardOutcome } from "@/model/result";
import { buildPlayedContractCode } from "@/lib/buildPlayedContractCode";
import {
  buildAdjustedScore,
  buildWeightedScore,
} from "@/model/adjusted-score";
import { getDirectorToken } from "@/lib/director-token";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import { useSections } from "@/hooks/sections";
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
  includeSection,
  onLineSelected,
  onBack,
}: {
  boardNumber: number;
  includeSection: boolean;
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
      includeSection={includeSection}
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

  // A board number is shared across sections, so a multi-section traveller can
  // list pairs from more than one section — keep the section in each pair label
  // then. With one section it is redundant, so drop it. (The NS/EW direction is
  // always dropped — the column header shows it.)
  const { sections } = useSections(game.gameId);
  const includeSection = sections.length > 1;

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

  /**
   * Emit one director ruling and advance the wizard. Owns the shared scaffold
   * every ruling repeats: flip to the saving spinner, clear any prior error,
   * emit the event with the standard `{ gameId, directorToken, round/table/board }`
   * envelope plus the ruling's own `extra` fields, then either finish (on
   * success) or surface a ruling-specific error and return to the board picker.
   *
   * `location` is captured from the `enterContract` step the wizard was opened
   * on; `handleWizardComplete` passes it through so this stays independent of
   * which `wizardStep` React has committed by the time the promise resolves.
   */
  async function submitRuling(
    location: { roundNumber: number; tableNumber: number; boardNumber: number },
    event: string,
    extra: Record<string, unknown>,
    errorMessage: string,
  ) {
    setWizardStep({ step: "saving" });
    setError(null);

    try {
      await emitWithAck(event, {
        gameId: game.gameId,
        directorToken: getDirectorToken(game.gameId),
        boardNumber: location.boardNumber,
        roundNumber: location.roundNumber,
        tableNumber: location.tableNumber,
        ...extra,
      });

      onResultCorrected();
    } catch (err) {
      setError(err instanceof Error ? err.message : errorMessage);
      setWizardStep({ step: "selectBoard" });
    }
  }

  /**
   * Map a completed wizard result to the ruling it emits: the socket event, the
   * ruling-specific payload fields, and the error message shown if it fails.
   * The `contract` / special-outcome (PO/NP) / played-contract cases are not in
   * this table — they all override with a computed `result` string and are
   * handled as the default in `handleWizardComplete`.
   */
  function rulingFor(
    data: DirectorWizardResult,
  ): { event: string; extra: Record<string, unknown>; errorMessage: string } | null {
    switch (data.type) {
      case "adjusted":
        return {
          event: SocketEvents.OVERRIDE_RESULT_TRAVELLER,
          extra: { result: buildAdjustedScore(data.nsPercent, data.ewPercent) },
          errorMessage: "Failed to save override",
        };
      case "weighted":
        return {
          event: SocketEvents.OVERRIDE_RESULT_TRAVELLER,
          extra: { result: buildWeightedScore(data.components) },
          errorMessage: "Failed to save override",
        };
      case "cancel":
        return {
          event: SocketEvents.CANCEL_BOARD_TRAVELLER,
          extra: { result: buildAdjustedScore(data.nsPercent, data.ewPercent) },
          errorMessage: "Failed to cancel board",
        };
      case "removeTeams":
        return {
          event: SocketEvents.REMOVE_TEAMS_BOARD_TRAVELLER,
          extra: { fault: data.fault },
          errorMessage: "Failed to remove teams board",
        };
      case "voidMatch":
        return {
          event: SocketEvents.VOID_TEAMS_MATCH_TRAVELLER,
          extra: { cause: data.cause },
          errorMessage: "Failed to void match",
        };
      case "voidPairs":
        return {
          event: SocketEvents.VOID_PAIRS_MATCH_TRAVELLER,
          extra: { cause: data.cause },
          errorMessage: "Failed to void match",
        };
      case "mismatch":
        return {
          event: SocketEvents.MISMATCH_TRAVELLER,
          extra: {
            side: data.side,
            direction: data.direction,
            fault: data.fault,
          },
          errorMessage: "Failed to mark mismatch",
        };
      // A `contract` result (and any non-ruling result) overrides with a
      // computed `result` string instead — handled by the caller's default.
      default:
        return null;
    }
  }

  function handleWizardComplete(data: DirectorWizardResult) {
    // Defensive type-narrowing guard. `handleWizardComplete` is only ever wired
    // to the wizard rendered in the "enterContract" state, so this early return
    // is unreachable in practice but required to narrow the union below.
    /* v8 ignore next */
    if (wizardStep.step !== "enterContract") return;

    const location = {
      roundNumber: wizardStep.roundNumber,
      tableNumber: wizardStep.tableNumber,
      boardNumber: wizardStep.boardNumber,
    };

    // Every ruling that overrides to a FIXED payload is a straight table
    // lookup. A `contract` result overrides with a COMPUTED `result` string, so
    // it is not in the table and falls through to the contract path below.
    const ruling = rulingFor(data);
    if (ruling) {
      submitRuling(location, ruling.event, ruling.extra, ruling.errorMessage);
      return;
    }

    // A played or special-outcome (PO/NP) contract: both override with a
    // computed `result` string. PO/NP pass straight through; a played contract
    // is parsed and reassembled into its full result code first.
    const { contract, result } = data as {
      contract: ContractCode | SpecialBoardOutcome;
      result: number;
    };
    const resultCode =
      contract === "PO" || contract === "NP"
        ? contract
        : (() => {
            const parsed = parseContract(contract);
            return buildPlayedContractCode(
              parsed.level,
              parsed.suit,
              parsed.doubling,
              parsed.declarer,
              result,
            );
          })();

    submitRuling(
      location,
      SocketEvents.OVERRIDE_RESULT_TRAVELLER,
      { result: resultCode },
      "Failed to save override",
    );
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
            includeSection={includeSection}
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
